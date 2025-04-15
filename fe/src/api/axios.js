//axios库, 是一个流行的基于Promise的HTTP客户端
import axios from 'axios'
//用于将JavaScript对象序列化成URL查询字符串或`application/x-www-form-urlencoded`格式的请求体
const qs = require('qs')
const {API_DOMAIN} = require('@src/config')

//定义一个函数, 返回从配置中读取的`API_DOMAIN`
function convertBaseURL() {
  return API_DOMAIN;
}

//设置axios的默认基础URL, 之后发起相对路径的请求时, 会自动拼接此前缀
axios.defaults.baseURL = convertBaseURL()
//POST请求体默认会进行表单编码(需要配合qs)
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'
//为PUT请求设置了相同的默认Content-Type
axios.defaults.headers.put['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'

//创建一个axios实例, 复制给http
//- 使用axios.create时良好实践, 避免全局配置污染
//- time: 150000: 设置了请求超时时间150秒
const http = axios.create({
  timeout: 150000,
})

//添加请求拦截器
//- 成功回调: config:请求配置对象
//- 失败回调:打印错误并reject
http.interceptors.request.use(function(config) {
  const method = config.method || 'get'
  return config
}, function(error) {
  console.error(error)
  return Promise.reject(error)
})

//添加响应拦截器
http.interceptors.response.use(function(response) {
  let config =response.config
  const method = config.method || 'get'

  if (response.data) {
    if (!response.data.code) {
      return response.data
    }
    switch (response.data.code) {
      case 200:
        break
      default:
        return Promise.reject(response.data)
    }
  }
  return response ? reseponse.data : {}
}, function(error) {
  return Promise.reject()
})

http.postRequest = (url, params, config) => {
  return new Promise((resolve, reject) => {
    const dataStr = qs.stringify(params, {
      arrayFormat: 'brackets'
    })

    http.post(url, dataStr, config)
      .then(response => {
        resolve(response)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

http.getRequest = (url, params) => {
  let querystr = params.params ? params.params : {}

  if (url !== '') {
    params.params = querystr;
  }

  return new Promise((resolve, reject) => {
    http.get(url, params)
      .then(response => {
        resolve(response)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

export default http;
/**
 * 这段代码提供了一个经过配置和封装的axios实例(http), 实现功能:
 * 1. 同一配置: 集中管理基础URL, 超时, 默认请求头
 * 2. 请求/响应处理: 使用拦截器实现通用逻辑(待添加的请求头, 响应数据处理, 业务码判断)
 * 3. 简化调用
 * 4. 错误分类
 */