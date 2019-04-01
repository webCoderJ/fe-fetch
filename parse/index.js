/**
 * README
 * 读取api层json文件，生成api配置
 * ！！注意，只是一个示例脚本，实际项目必须结合api文件格式来编写解析脚本！！
 */

let fs = require("fs");
let path = require("path");
let apiJson = require("./api.json");

let jsFile = fs.createWriteStream(path.resolve(__dirname, `./apiModules/test.js`), {
    encoding: "utf8"
});

function parsePostManJson(json) {
    Object.keys(json).map(key => {
        // 添加注释
        if (key === "name") {
            jsFile.write(`// ${json[key]}`)
            // console.log(`// ${json[key]}`);
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
            // console.log(content);
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
