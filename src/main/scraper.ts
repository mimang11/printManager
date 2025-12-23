/**
 * ============================================
 * 爬虫引擎 - 抓取打印机计数器数据
 * ============================================
 * 使用 axios 请求打印机网页，cheerio 解析 HTML
 * iconv-lite 处理 GBK/GB2312 编码
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { PrinterConfig, ScrapeResult, PrinterDetail } from '../shared/types';

// 请求超时时间 (毫秒)
const REQUEST_TIMEOUT = 10000;

/**
 * 抓取打印机计数器数据
 * @param printer 打印机配置
 * @returns 抓取结果
 */
export async function scrapeCounter(printer: PrinterConfig): Promise<ScrapeResult> {
  return await testScrapeUrl(printer.target_url, printer.dom_selector, printer.id);
}

/**
 * 测试抓取 URL
 * @param url 目标 URL
 * @param selector CSS 选择器
 * @param printerId 打印机 ID (可选)
 * @returns 抓取结果
 */
export async function testScrapeUrl(
  url: string, 
  selector: string, 
  printerId: string = 'test'
): Promise<ScrapeResult> {
  const timestamp = Date.now();

  try {
    // 发送 HTTP 请求，使用 arraybuffer 以便处理不同编码
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      responseType: 'arraybuffer',
      // 忽略 SSL 证书错误 (某些旧打印机可能使用自签名证书)
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });

    // 尝试检测编码并转换
    const html = decodeHtml(response.data, response.headers['content-type']);

    // 先尝试从 JavaScript 变量中提取数据 (某些打印机用 JS 动态渲染)
    // 匹配类似 var info=['Total Printed Impressions',278179,...] 的模式
    const jsInfoMatch = html.match(/var\s+info\s*=\s*\[([^\]]+)\]/);
    if (jsInfoMatch) {
      // 提取 Total Printed Impressions 的值
      const infoContent = jsInfoMatch[1];
      const totalMatch = infoContent.match(/'Total Printed Impressions'\s*,\s*(\d+)/i);
      if (totalMatch) {
        return {
          success: true,
          printer_id: printerId,
          counter: parseInt(totalMatch[1], 10),
          timestamp,
        };
      }
      // 如果没找到 Total，尝试获取第一个数字
      const firstNumberMatch = infoContent.match(/,\s*(\d+)/);
      if (firstNumberMatch) {
        return {
          success: true,
          printer_id: printerId,
          counter: parseInt(firstNumberMatch[1], 10),
          timestamp,
        };
      }
    }

    // 使用 cheerio 解析 HTML
    const $ = cheerio.load(html);

    // 使用选择器查找元素
    let element = $(selector);

    // 如果找不到，尝试移除 tbody（浏览器自动添加的，实际HTML可能没有）
    if (element.length === 0) {
      const selectorWithoutTbody = selector.replace(/\s*>\s*tbody\s*>\s*/g, ' > ');
      element = $(selectorWithoutTbody);
    }

    // 如果还是找不到，尝试更宽松的匹配（移除所有 tbody）
    if (element.length === 0) {
      const selectorWithoutTbody2 = selector.replace(/\s*>\s*tbody\s*/g, ' ');
      element = $(selectorWithoutTbody2);
    }

    // 尝试移除 body 前缀
    if (element.length === 0) {
      const simplifiedSelector = selector
        .replace(/\s*>\s*tbody\s*/g, ' ')
        .replace(/^body\s*>\s*/g, '');
      element = $(simplifiedSelector);
    }

    if (element.length === 0) {
      // 返回完整 HTML 用于调试
      return {
        success: false,
        printer_id: printerId,
        error: `HTML内容: ${html.substring(0, 2000)}`,
        timestamp,
      };
    }

    // 获取文本内容并提取数字
    const text = element.text().trim();
    const number = extractNumber(text);

    if (number === null) {
      return {
        success: false,
        printer_id: printerId,
        error: `找到元素但无法提取数字，元素内容: "${text}"`,
        timestamp,
      };
    }

    return {
      success: true,
      printer_id: printerId,
      counter: number,
      timestamp,
    };

  } catch (error: any) {
    // 处理不同类型的错误
    let errorMessage = '未知错误';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = '无法连接到打印机，请检查 IP 地址和网络连接';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = '连接超时，打印机可能离线或网络不稳定';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = '无法解析地址，请检查 URL 是否正确';
    } else if (error.response) {
      errorMessage = `HTTP 错误: ${error.response.status} ${error.response.statusText}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      printer_id: printerId,
      error: errorMessage,
      timestamp,
    };
  }
}

/**
 * 解码 HTML 内容
 * 自动检测并处理 GBK/GB2312 编码
 */
function decodeHtml(buffer: Buffer, contentType?: string): string {
  // 尝试从 Content-Type 头获取编码
  let encoding = 'utf-8';
  
  if (contentType) {
    const match = contentType.match(/charset=([^;]+)/i);
    if (match) {
      encoding = match[1].trim().toLowerCase();
    }
  }

  // 如果没有从头部获取到编码，尝试从 HTML meta 标签检测
  const utf8Html = buffer.toString('utf-8');
  const metaMatch = utf8Html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
  if (metaMatch) {
    encoding = metaMatch[1].toLowerCase();
  }

  // 处理常见的中文编码
  if (encoding === 'gbk' || encoding === 'gb2312' || encoding === 'gb18030') {
    return iconv.decode(buffer, 'gbk');
  }

  return utf8Html;
}

/**
 * 从文本中提取数字
 * 过滤掉非数字字符，返回整数
 */
function extractNumber(text: string): number | null {
  // 移除所有非数字字符 (保留数字)
  const digits = text.replace(/[^\d]/g, '');
  
  if (digits.length === 0) {
    return null;
  }

  const number = parseInt(digits, 10);
  return isNaN(number) ? null : number;
}

/**
 * 获取打印机详情页面数据
 * 从 getStatus.cgi 页面抓取所有字段
 * @param baseUrl 打印机基础 URL (如 http://192.168.1.18)
 */
export async function fetchPrinterDetail(baseUrl: string): Promise<{ success: boolean; data?: PrinterDetail; error?: string }> {
  try {
    // 构建状态页面 URL
    const statusUrl = `${baseUrl}/web/guest/cn/websys/webArch/getStatus.cgi`;
    
    const response = await axios.get(statusUrl, {
      timeout: REQUEST_TIMEOUT,
      responseType: 'arraybuffer',
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });

    const html = decodeHtml(response.data, response.headers['content-type']);
    const $ = cheerio.load(html);
    
    const data: PrinterDetail = {};
    
    // 方法1: 查找所有表格行，提取键值对
    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim().replace(/[:：]/g, '');
        const value = $(cells[1]).text().trim();
        if (key && value && key.length < 50) {
          data[key] = value;
        }
      }
    });
    
    // 方法2: 查找 th + td 组合
    $('table tr').each((_, row) => {
      const th = $(row).find('th').text().trim().replace(/[:：]/g, '');
      const td = $(row).find('td').text().trim();
      if (th && td && th.length < 50) {
        data[th] = td;
      }
    });

    // 方法3: 查找 dt + dd 组合
    $('dl').each((_, dl) => {
      $(dl).find('dt').each((i, dt) => {
        const key = $(dt).text().trim().replace(/[:：]/g, '');
        const dd = $(dl).find('dd').eq(i);
        const value = dd.text().trim();
        if (key && value) {
          data[key] = value;
        }
      });
    });

    if (Object.keys(data).length === 0) {
      // 如果没有提取到数据，返回原始 HTML 用于调试
      return {
        success: false,
        error: `未能提取字段。HTML: ${html.substring(0, 1500)}`,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '获取详情失败',
    };
  }
}
