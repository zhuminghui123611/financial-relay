const ccxt = require('ccxt');
const NodeCache = require('node-cache');

// 简单缓存，TTL为30秒
const cache = new NodeCache({ stdTTL: 30 });

exports.handler = async function(event, context) {
  // 启用CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS预检成功' }),
    };
  }

  try {
    // 解析查询参数
    const params = event.queryStringParameters || {};
    const { exchange, symbol, timeframe, limit } = params;
    
    // 验证必要参数
    if (!exchange || !symbol) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少必要参数: exchange, symbol',
          timestamp: Date.now()
        }),
      };
    }
    
    // 构建缓存键
    const cacheKey = `crypto:${exchange}:${symbol}:${timeframe}:${limit}`;
    
    // 检查缓存
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: Date.now()
        }),
      };
    }
    
    // 验证交易所是否支持
    if (!ccxt.exchanges.includes(exchange)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `不支持的交易所: ${exchange}`,
          supported: ccxt.exchanges,
          timestamp: Date.now()
        }),
      };
    }
    
    console.log(`请求CCXT数据: ${exchange} ${symbol} ${timeframe}`);
    
    // 初始化交易所
    const exchangeInstance = new ccxt[exchange]({
      timeout: 30000,
      enableRateLimit: true,
    });
    
    // 获取K线数据
    let data;
    if (timeframe) {
      data = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, limit ? parseInt(limit) : undefined);
    } else {
      data = await exchangeInstance.fetchTicker(symbol);
    }
    
    // 缓存响应
    cache.set(cacheKey, data);
    
    // 返回结果
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
        cached: false,
        timestamp: Date.now()
      }),
    };
  } catch (error) {
    console.error('CCXT API请求失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: Date.now()
      }),
    };
  }
}; 