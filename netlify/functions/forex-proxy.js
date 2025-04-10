const axios = require('axios');
const NodeCache = require('node-cache');

// 简单缓存，TTL为60秒
const cache = new NodeCache({ stdTTL: 60 });

// 福汇API基础URL
const FXCM_BASE_URL = 'https://api-demo.fxcm.com';

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
    // 解析路径和参数
    const path = event.path.replace(/^\/api\/forex\//, '');
    const params = event.queryStringParameters || {};
    
    // 构建缓存键
    const cacheKey = `forex:${path}:${JSON.stringify(params)}`;
    
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
    
    // 构建请求URL
    const url = `${FXCM_BASE_URL}/${path}`;
    console.log(`请求福汇API: ${url}`);
    
    // 发送请求
    const response = await axios.get(url, { params });
    
    // 缓存响应
    cache.set(cacheKey, response.data);
    
    // 返回结果
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: response.data,
        cached: false,
        timestamp: Date.now()
      }),
    };
  } catch (error) {
    console.error('福汇API请求失败:', error);
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.response?.data || null,
        timestamp: Date.now()
      }),
    };
  }
}; 