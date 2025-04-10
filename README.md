# 金融数据中继服务

此项目提供金融数据中继服务，绕过网络限制访问福汇API和CCXT库支持的加密货币交易所。

## 功能特点

- 支持福汇外汇数据API
- 支持CCXT库的所有加密货币交易所
- 自动缓存减少API调用
- 完全支持CORS跨域请求
- 部署在Netlify上，可靠稳定

## 快速部署

1. Fork或克隆此仓库
2. 在Netlify中导入项目
3. 无需任何额外配置，直接部署

## 本地开发

1. 克隆仓库
```bash
git clone <repository-url>
cd financial-relay
```

2. 安装依赖
```bash
npm install
```

3. 本地运行
```bash
npm run dev
```

## API使用

### 福汇外汇数据

```
GET /api/forex/candles/{symbol}/{timeframe}?limit={limit}
```

示例:
```
/api/forex/candles/EUR/USD/m1?limit=100
```

### CCXT加密货币数据

```
GET /api/crypto-proxy?exchange={exchange}&symbol={symbol}&timeframe={timeframe}&limit={limit}
```

示例:
```
/api/crypto-proxy?exchange=binance&symbol=BTC/USDT&timeframe=1h&limit=100
```

## 在Sealos中使用

在您的Sealos应用中，只需将API请求指向Netlify部署的URL即可:

```javascript
async function fetchForexData(symbol, timeframe, limit) {
  const response = await fetch(
    `https://your-netlify-app.netlify.app/api/forex/candles/${symbol}/${timeframe}?limit=${limit}`
  );
  return await response.json();
}

async function fetchCryptoData(exchange, symbol, timeframe, limit) {
  const url = new URL('https://your-netlify-app.netlify.app/api/crypto-proxy');
  url.searchParams.append('exchange', exchange);
  url.searchParams.append('symbol', symbol);
  url.searchParams.append('timeframe', timeframe);
  url.searchParams.append('limit', limit);
  
  const response = await fetch(url);
  return await response.json();
}
``` 