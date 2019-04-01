> 原谅我是个标题党，不过仔细看完这篇文章，一定会有所收获的！

本篇文章主要目的是把前端的请求方式做一个极度精简和自动化，给我们繁重的搬砖生活，带来一点幸福感^_^。

相信跟我一样的前端狗早就写烦了各种请求，写烦了各种请求路径，大家在项目中请求的方式都各不相同，但是大致的方式都是差不多的。来看看以下大家常用的请求方式弊端分析，看看是不是也有类似的痛点，以vue + axios项目为例。

```shell
# 通用的文件结构
request
|-- config.js
|-- http.js
```

```js
// config.js，主要对项目中请求的异常捕捉，添加配置等
import Vue from "vue";
import axios from "axios";
import { Notification } from 'element-ui';
import store from "@/store";

// 配置 Content-Type
axios.defaults.headers.post["Content-Type"] = "aplication/json";

/**
 * 配置 axios
 */
// http request 拦截器
axios.interceptors.request.use(
    config => {
        return config;
    },
    err => {
        return Promise.reject(err);
    }
);

// http response 拦截器
axios.interceptors.response.use(
    response => {
        // 对某些错误代码进行判断
        if(response.data.code == 2){ // identity failure
            store.dispatch("LogOut");
        }
        if (response.data.code !== 0 && response.data.msg !== -1) {
            Notification({
                title: '系统错误',
                message: response.data.msg,
                type: "error",
                offset: 35,
                duration: 2000
            });
        }
        return response;
    },
    error => {
        console.log(error);
    }
);

export default axios;
```

这个文件，在大家的项目里应该都是存在的，主要用于请求中的公共配置和异常捕捉。

```js
// http.js，对config完成的axios进行封装
import axios from config
export function get(url, payload){
    return axios.get(url, {
        params: payload
    })
}

export function post(url, payload){
    return axios.post(url, {
        params: payload
    })
}

// export function delete...
```

这个文件主要对`axios`的常用方法做一些封装，主要为了参数传递方式一致，调用时可以不用写`axios.` 等，总之这样就有了一个统一的入口，调用时更加方便。这样有它的好处，但是有没有更好的解决方案呢？如果还有 `DELETE` `PUT`这些请求方式呢？如果有10种请求方式呢？这里标记为`痛点一`，我们在下面解决。

```js
// test.vue
import * as http from '@/path/to/http'

export default {
    methods: {
        getData(){
            https.get('/v1/systemInfo').then(res => {
                // do something
            })
        }
    }
}
```

这就是我们调用时候的样子，看起来也很规范了。但是大家试想一下，如果后端对api做了批量的修改呢。如果每个接口调用都散落在每个组件文件里，我们是不是要渠道每个文件里取对它们逐一修改，维护起来就很繁琐了。还有每次都要去查看api文档(`痛点二`)要调用的接口路径(`痛点三`)和请求方式(`痛点四`)是什么，然后复制到业务页面，每次我们在做这样的事情的时候心里是不是在默默骂娘，TMD怎么这么多接口要写？？？

### 解决方案

上面说了一大堆废话，说了那么多问题。特么要是没拿出个好看的方案，劳资...，各位别着急，听..听我慢慢说...

#### 目录结构

```bash
http
|--apiModules
|	|--user.js
|	|--system.js
|--parse
|   |--parse.js
|   |--api.json
|--fetch.js
|--config.js
```

这就是我们的目录结构，下面我就逐一介绍

#### 如何解决痛点一？

为了避免繁琐的封装已有的请求方法，我们可以写一个方法去实现，传入什么请求方式，就调用axios对象的什么方法。参数的传递方式写在判断里，这样就避免了我们要用到什么方式，就需要去封装一个什么请求方法。

```js
import axios from './config' // config文件还是跟上面的一样，这里不再说明
// fetch.js
export function fetch(method, url, payload){
    // 查看axios的文档，我们知道除了get的传参方式不一样，其余的都是直接传递，那么我们只需要判断get就可以
    if(method === 'get'){
        return axios['get'](url, {params: payload})
    } else {
        return axios[method](url, payload)
    }
}
```

所以我们的业务页面代码变成了这样：

```js
// test.vue
import fetch from '@/path/to/fetch'

export default {
    methods: {
        getData(){
            fetch('get','/v1/systemInfo', {...}).then(res => {
                // do something
            })
        }
    }
}
```

这里看起来其实没什么变化，仅仅改了方法名而已。但是又发现了一个小问题，每次新建一个页面我都需要引用一次fetch吗？麻烦啊！所以可以直接把fetch方法挂载到vue实例上，那么在组件内部就可以直接调用了，又解决了一个小问题 ^ _ ^

```js
// fetch.js
class Fetch {
    // 给Vue提供安装接口
    install(vue) {
        Object.assign(vue.prototype, {
            $fetch: this.fetch
        });
    }

    fetch(method, url, payload) {
      if(method === 'get'){
            return axios['get'](url, {params: payload})
        } else {
            return axios[method](url, payload)
        }
    }
}
export default new Fetch();

// main.js
import Vue from 'vue'
import Fetch from '@/path/to/fetch'
Vue.use(Fetch)

// test.vue
export default {
    methods: {
        getData(){
            this.$fetch('get','/v1/systemInfo', {...}).then(res => {
                // code
            })
        }
    }
}
```

#### 如何优雅地解决痛点二三四？

我们再来回顾一下：

- 请求方式的封装 (`痛点一`)
- 每次都要去查看api文档(`痛点二`)
- 要调用的接口路径(`痛点三`)
- 查看请求方式(`痛点四`)

`痛点一`可能大家不一定都存在，那么`二三四`应该是通病了，也是本文主要想解决的。为了不每次都要翻看文档的请求方式，请求路径。作为一个标准的`前端配置攻城狮`我们可以把这些信息统一配置起来，就避免了每次都去查看的烦恼。我们关心的应该是返回的数据格式和传入的参数等，设想一下我们每次这样发请求该有多幸福啊！

```js
this.$fetch('system.getVersion').then(res => {
    // code
})

/*
 *	大家的项目中，后端api肯定都是区别了某个模块的，可能每个模块做的人也不一样
 *	在调用的时候指定一下模块名，接口名就可以
 *	不需要知道知道请求方式，请求路径
 */
```

要满足以上的需求，我们肯定需要用配置文件来记录以上信息，虽然我们不用关心，但是程序是需要关心的！`./apiModules` 就是用来存放这些信息的。

```js
// ./apiModules/system.js
export default {
    getVersion: {
        url: 'path/to/getVersion',
        method: 'get'
    },
    modVersion: {
        url: 'path/to/modVersion',
        method: 'post'
    }
}

// ./apiModules/user.js
export default {
    getInfo: {
        url: 'path/to/getInfo',
        method: 'get'
    }
}

// 当然，以上的配置字段都可以根据需求自定义，比如同一apiName要根据用户角色调用不同接口，只需要在fetch写上相应的判断就可以，非常方便！
```

所以我们又要修改一下fetch文件了

```js
import axios from "./config";

// 根据 ./apiModules文件夹中 生成fetchCfg -- 实现方法 webpack-require.context()
// fetchCfg = {
//     system,
//     user
// };
const fetchCfg = {};
// 通过 require.context 可以让webpack自动引用指定文件夹中的文件
// 我们将它存到 fetchCfg 上以供 fetch 方法使用
const requireContext = require.context('./apiModules', false, /\.js$/)
requireContext.keys().forEach(path => {
    let module = path.replace(".js", "").replace("./", "")
    fetchCfg[module] = requireContext(path).default
})

/**
 * 解析参数
 * 这个函数主要负责解析传入fetch的 module 和 apiName
 * @param {String} param
 */
const fetchParam = param => {
    var valid = /[a-z]+(\.[a-z])+/.test(param);
    if (!valid) {
        throw new Error(
            "[Error in fetch]: fetch 参数格式为 moduleName.apiName"
        );
    } else {
        return {
            moduleName: param.split(".")[0],
            apiName: param.split(".")[1]
        };
    }
};

class Fetch {
    // 给Vue提供安装接口
    install(vue) {
        Object.assign(vue.prototype, {
            $fetch: this.fetch
        });
    }

    /**
     * 对axios封装通用fetch方法
     * 会根据传入的下列参数自动寻找 method 和路径
     * @param {*} module 对应 fetch配置的名字
     * @param {*} apiName 该模块下的某个请求配置名
     */
    fetch(moduleInfo, payload) {
        let prefix = '/api'
        let moduleName = fetchParam(moduleInfo)["moduleName"];
        let apiName = fetchParam(moduleInfo)["apiName"];
        // 判断没有找到传入模块
        if(!fetchCfg.hasOwnProperty(moduleName)){
            throw new Error(
                `[Error in fetch]: 在api配置文件中未找到模块 -> ${moduleName}`
            );
        }
        // 判断没有找到对应接口
        if(!fetchCfg[moduleName].hasOwnProperty(apiName)){
            throw new Error(
                `[Error in fetch]: 在模块${moduleName}中未找到接口 -> ${apiName}`
            );
        }
        let fetchInfo = fetchCfg[moduleName][apiName];
        let method = fetchInfo["method"];
        let url = `${prefix}/${fetchInfo["url"]}`;

        if (method === "get") {
            return axios[method](url, {
                params: payload
            });
        } else {
            return axios[method](url, payload);
        }
    }
}

export default new Fetch();

```

通过以上方法，优雅地解决了 `二三四` 三个痛点！

#### 锦上添花的api配置文件解析脚本

最后来说说我们的parse文件夹，这是一个锦上添花的文件，如果恰好你的后端用了类似 [swagger](<https://swagger.io/>) 或 [postman](<https://www.getpostman.com/>) 等可以导出结构化的文件给你，比如json，然后你通过简单的node脚本转化就可以得到以上的api配置信息，一旦后端修改了api，我们再`run`一遍脚本就可以把所有的更改应用到项目，而不需要手动修改api文件了，就算是需要手动修改，也不用在每个业务文件中修改，方便快速~

以下是我读取api层postman文档的脚本，这里也可以有很多自动化的方式。比如这个文档被托管在了git，每次api更新文档之后，我们可以预先写一段shell脚本，把git的更新同步到本地，然后启动node脚本(可以把命令放在package.json里的script标签中用npm调用)读取/写入文档。可能在第一次写脚本的时候有不会的地方，但是一旦写好，与后端小伙伴做好约定，之后的工作是不是快了很多呢？

```js
// parse.js
/**
 * README
 * 读取中间层json文件，生成api配置
 */

let fs = require("fs");
let path = require("path");
let dosJson = require("./api.json");

var jsFile = fs.createWriteStream(path.resolve(__dirname, "./api/ddos.js"), {
    encoding: "utf8"
});

function parsePostManJson(json) {
    Object.keys(json).map(key => {
        // 添加注释
        if (key === "name") {
            jsFile.write(`// ${json[key]}`)
            console.log(`// ${json[key]}`);
        }
        if(key === "request"){
            let urlName = json[key].url.path[json[key].url.path.length - 1];
            let url = json[key].url.raw.replace("{{HOST}}", "");
            let method = json[key].method;
            let params = "";
            if(method === "GET"){
                params = `// ${url.split("?")[1] ? url.split("?")[1] : ""}`;
                url = url.split("?")[0];
            }
            // let content = `${method === 'GET' ? params : ""}`
            let content = `
                ${urlName}: {
                    url: "${url}",
                    method: "${method.toLowerCase()}",
                    custom: true
                },
            `
            console.log(content);
            jsFile.write(content)
        }
        if(key === "item" && json[key].constructor === Array){
            json[key].map(itemJson => {
                parsePostManJson(itemJson);
            })
        }
    });
}

jsFile.write(`export default {`)

parsePostManJson(dosJson);

jsFile.write(`}`)

jsFile.end();

jsFile.on('finish',function(){
    console.log('写入完成');
})

jsFile.on('error',function(){
    console.log('写入失败');
})
```

输出的api文件，还添加了一些注释，如果有需要也可以直接把参数格式写入，以后就不用去打开线上文档查看了，是不是很方便呢？

```js
// ddos.js
export default {
    // 获取ddos模式
    getDDosCfg: {
        url: "/getDDosCfg",
        method: "post",
        custom: true,
        napi: true
    },

    // DDos融入// 数据报表统计// 获取机房概览信息
    statisticsInfo: {
        url: "/admin/Ddos/Statistic/statisticsInfo",
        method: "post",
        custom: true
    }
};

```

### 总结一下

哈哈，能耐心看到这里实属不易，你真是一个小棒棒呢~ (⊙﹏⊙)

So，在开发中，我们尽量要去思考一个问题，就是怎么让繁琐的事情变得简单化，在遇到繁琐重复性高的问题，要有去解决的想法。能用程序去完成的东西，我们就尽量不重复搬砖。这样既可以在繁忙的开发中获得一点幸福感，也可以让我们的coding能力慢慢提升~

以上的解决方式仅仅是一种思路，具体的代码实现上可以根据项目的框架、实际引用的请求库、业务需求来封装。当然，如果恰好你跟我的业务需求差不多，以上的代码可以满足业务，我把代码已经放到了[github](https://github.com/webCoderJ/fe-fetch)，欢迎大家参考使用。