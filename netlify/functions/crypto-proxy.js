const ccxt = require('ccxt');
const NodeCache = require('node-cache');

// 简单缓存，TTL为30秒
const cache = new NodeCache({ stdTTL: 30 });

// 可用交易所列表，按优先级排序
const AVAILABLE_EXCHANGES = ['huobi', 'kraken', 'kucoin', 'okx'];

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
    let { exchange, symbol, timeframe, limit } = params;
    
    // 验证必要参数
    if (!symbol) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少必要参数: symbol',
          timestamp: Date.now()
        }),
      };
    }
    
    // 如果未指定交易所或指定了binance，则使用预定义的可用交易所列表
    if (!exchange || exchange === 'binance') {
      exchange = AVAILABLE_EXCHANGES[0]; // 默认使用第一个可用交易所
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
          exchange: exchange,
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
          supported: AVAILABLE_EXCHANGES,
          timestamp: Date.now()
        }),
      };
    }
    
    console.log(`请求CCXT数据: ${exchange} ${symbol} ${timeframe}`);
    
    // 使用多个交易所尝试获取数据
    let data = null;
    let usedExchange = exchange;
    let errors = {};
    
    // 首先尝试用户指定的交易所
    try {
      const exchangeInstance = new ccxt[exchange]({
        timeout: 15000,
        enableRateLimit: true,
      });
      
      // 获取K线数据
      if (timeframe) {
        data = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, limit ? parseInt(limit) : undefined);
      } else {
        data = await exchangeInstance.fetchTicker(symbol);
      }
    } catch (err) {
      console.error(`交易所 ${exchange} 请求失败: ${err.message}`);
      errors[exchange] = err.message;
      
      // 如果用户指定的交易所失败，尝试其他交易所
      if (AVAILABLE_EXCHANGES.includes(exchange)) {
        // 从可用交易所列表中移除已尝试的交易所
        const remainingExchanges = AVAILABLE_EXCHANGES.filter(e => e !== exchange);
        
        // 依次尝试其他交易所
        for (const altExchange of remainingExchanges) {
          try {
            console.log(`尝试备用交易所: ${altExchange} ${symbol} ${timeframe}`);
            
            const altExchangeInstance = new ccxt[altExchange]({
              timeout: 15000,
              enableRateLimit: true,
            });
            
            // 获取K线数据
            if (timeframe) {
              data = await altExchangeInstance.fetchOHLCV(symbol, timeframe, undefined, limit ? parseInt(limit) : undefined);
            } else {
              data = await altExchangeInstance.fetchTicker(symbol);
            }
            
            if (data && data.length > 0) {
              usedExchange = altExchange;
              break; // 找到可用的交易所，跳出循环
            }
          } catch (altErr) {
            console.error(`备用交易所 ${altExchange} 请求失败: ${altErr.message}`);
            errors[altExchange] = altErr.message;
            // 继续尝试下一个交易所
          }
        }
      }
    }
    
    // 如果所有交易所都失败
    if (!data) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          success: false,
          error: '所有交易所连接都失败',
          details: errors,
          attempted_exchanges: Object.keys(errors),
          timestamp: Date.now()
        }),
      };
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
        exchange: usedExchange,  // 返回实际使用的交易所
        original_exchange: exchange, // 原始请求的交易所
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