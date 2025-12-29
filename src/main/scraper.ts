/**
 * 爬虫引擎 - 抓取打印机数据
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const REQUEST_TIMEOUT = 10000;

/** 打印机详情数据 */
interface PrinterDetail {
  [key: string]: string;
}

/** 解码 HTML 内容 */
function decodeHtml(buffer: Buffer, contentType?: string): string {
  let encoding = 'utf-8';
  
  if (contentType) {
    const match = contentType.match(/charset=([^;]+)/i);
    if (match) encoding = match[1].trim().toLowerCase();
  }

  const utf8Html = buffer.toString('utf-8');
  const metaMatch = utf8Html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
  if (metaMatch) encoding = metaMatch[1].toLowerCase();

  if (encoding === 'gbk' || encoding === 'gb2312' || encoding === 'gb18030') {
    return iconv.decode(buffer, 'gbk');
  }

  return utf8Html;
}

/**
 * 获取打印机详情页面数据
 */
export async function fetchPrinterDetail(baseUrl: string): Promise<{ success: boolean; data?: PrinterDetail; error?: string }> {
  try {
    const statusUrl = `${baseUrl}/web/guest/cn/websys/webArch/getStatus.cgi`;
    
    const response = await axios.get(statusUrl, {
      timeout: REQUEST_TIMEOUT,
      responseType: 'arraybuffer',
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });

    const html = decodeHtml(response.data, response.headers['content-type']);
    const $ = cheerio.load(html);
    
    const data: PrinterDetail = {};
    
    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim().replace(/[:：]/g, '');
        const value = $(cells[1]).text().trim();
        if (key && value && key.length < 50) data[key] = value;
      }
    });
    
    $('table tr').each((_, row) => {
      const th = $(row).find('th').text().trim().replace(/[:：]/g, '');
      const td = $(row).find('td').text().trim();
      if (th && td && th.length < 50) data[th] = td;
    });

    $('dl').each((_, dl) => {
      $(dl).find('dt').each((i, dt) => {
        const key = $(dt).text().trim().replace(/[:：]/g, '');
        const dd = $(dl).find('dd').eq(i);
        const value = dd.text().trim();
        if (key && value) data[key] = value;
      });
    });

    if (Object.keys(data).length === 0) {
      return { success: false, error: `未能提取字段。HTML: ${html.substring(0, 1500)}` };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || '获取详情失败' };
  }
}
