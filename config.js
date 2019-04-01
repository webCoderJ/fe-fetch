import Vue from "vue";
import axios from "axios";
Vue.axios = Vue.prototype.axios = axios;

// 配置 Content-Type
axios.defaults.headers.post["Content-Type"] = "aplication/json";

/**
 * 可以对axios发出的每个请求做公共配置
 * 比如添加约定的 header 等
 */
axios.interceptors.request.use(
  config => {
    return config;
  },
  err => {
    return Promise.reject(err);
  }
);

/**
 * 可以对响应做一些公共配置
 * 比如判断code决定是否跳出登录
 */
axios.interceptors.response.use(
  response => {
    switch (response.data.code) {
        case -1:
          // todo
          break;
        // case ...
    }
    return response;
  },
  error => {
    console.log(error);
  }
);

export default axios;
