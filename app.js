import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs'
import path from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 开鸡！ */
const server = fastify();
server.listen({
    port: 3001,
    host: '0.0.0.0',
    log: true
}, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }

    console.log(`Geetest手动验证服务器正在监听 ${address} 端口！`)
})

server.register(fastifyStatic, {
    root: join(__dirname),
    prefix: '/'
});

/** 验证地址 */
server.get('/geetest', (request, reply) => {
    //获取query参数
    const { gt, challenge, callback, e } = request.query

    /** 读取html */
    let content = fs.readFileSync('index.html', 'utf8')
    /** 填入参数 */
    if (gt) {
        content = content.replace('id="gt"', `id="gt" value="${gt}"`)
    }
    if (challenge) {
        content = content.replace('id="challenge"', `id="challenge" value="${challenge}"`);

        /** 通过challenge参数保存文件 */
        const data = {
            "retcode": 204,
            "info": "服务器支持POST和GET请求，传入gt和challenge值即可生成，把challenge值传入callback字段可进行结果查询",
            "data": {
                "geetest_gt": gt,
                "source_challenge": null,
                "geetest_challenge": null,
                "geetest_seccode": null
            },
        }
        const fileName = `${challenge}.json`
        const filePath = path.join(__dirname, 'data', fileName)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4))
    }

    /** 回调地址 */
    if (callback) {
        const fileName = `${callback}.json`;
        const filePath = path.join(__dirname, 'data', fileName);

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            reply.type('application/json').send(content);

        } catch (err) {
            reply.code(404).send({ error: 'Not found' });
        }
    }

    /** 短链转发 */
    if (e) {
        const token = request.query.e;
        const valid = verifyToken(token);
        if (valid) {
            //构建HTML响应
            const popupHTML = `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>转发页面</title>
              </head>
              <body>
                <script>
                  //弹出浏览器弹窗
                  alert('请一定要进行验证，不然这个验证码就失效了，需重新获取');
                  
                  //等待用户点击确认后进行重定向
                  window.location.href = '${targetUrl}';
                </script>
              </body>
              </html>
            `
            reply
                .code(200)
                .type('text/html')
                .send(popupHTML)
        } else {
            // Token验证失败的响应
            reply.code(403).send({
                code: 403,
                message: 'Token不存在或已过期'
            }, null, 2)
        }

    }

    reply
        .type('text/html')
        .send(content);
});

server.post('/geetest', (req, reply) => {
    const requesBody = JSON.parse(req.body)
    targetUrl = requesBody.url
    const token = getRandomString(4)
    reply.send({
        token
    })
})
// 接收 challenge 和 seccode 参数
// 读取文件 - 更新数据 - 写入文件
server.post('/updateResult', (req, res) => {
    const { challenge, validate, seccode } = req.body;

    console.log({ challenge, validate, seccode })
    // 读取原文件
    const filePath = `./data/${challenge}.json`;
    let data = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(data);

    // 更新数据
    data.retcode = 200
    data.data.geetest_challenge = challenge;
    data.data.geetest_seccode = seccode;
    data.data.geetest_validate = validate;

    console.log(data)
    // 保存文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

    reply.type('application/json').send(filePath);
});

/** 回调 */
//server.get('/callback', (request, reply) => {
//
//    const challenge = request.query.challenge;
//
//    if (challenge) {
//        const fileName = `${challenge}.json`;
//        const filePath = path.join(__dirname, 'data', fileName);
//
//        try {
//            const content = fs.readFileSync(filePath, 'utf8');
//            reply.type('application/json').send(content);
//        } catch (err) {
//            reply.code(404).send({ error: 'Not found' });
//        }
//    } else {
//        reply.code(400).send({ error: 'Challenge required' });
//    }
//
//});


const tokenMap = {}
function getRandomString(len) {
    let _charStr = 'abacdefghjklmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ0123456789',
        min = 0,
        max = _charStr.length - 1,
        _str = '' //定义随机字符串 变量
    //判断是否指定长度，否则默认长度为15
    len = len || 15
    //循环生成字符串
    for (var i = 0, index; i < len; i++) {
        index = (function (randomIndexFunc, i) {
            return randomIndexFunc(min, max, i, randomIndexFunc)
        })(function (min, max, i, _self) {
            let indexTemp = Math.floor(Math.random() * (max - min + 1) + min),
                numStart = _charStr.length - 10;
            if (i == 0 && indexTemp >= numStart) {
                indexTemp = _self(min, max, i, _self)
            }
            return indexTemp
        }, i)
        _str += _charStr[index]
    }
    tokenMap[_str] = {
        createTime: Date.now()
    }

    return _str
}

/** 验证token有效性 */
function verifyToken(token) {
    const now = Date.now()
    const tokenData = tokenMap[token]

    if (!tokenData || now - tokenData.createTime > 120 * 1000) {
        return false; //不存在则无效
    }

    return true; //有效
}

