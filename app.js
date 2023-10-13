import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs'
import path from 'path'
import ejs from 'ejs'

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
    let content = fs.readFileSync('html/index.html', 'utf8')
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
            reply.code(404).send({ error: '未生成对应文件，请等待用户访问验证地址' });
        }
    }

    /** 短链转发 */
    if (e) {
        const token = request.query.e;
        const valid = verifyToken(token);
        if (valid) {
            // 读取HTML模板文件
            const template = fs.readFileSync('html/jump.ejs', 'utf8');

            // 使用EJS将targetUrl传递到HTML模板中
            const popupHTML = ejs.render(template, { targetUrl });

            reply
                .code(200)
                .type('text/html')
                .send(popupHTML)
        } else {
            // Token验证失败的响应
            const html = fs.readFileSync('html/old_token.html', 'utf8')
            reply
            .code(403)
            .type('text/html')
            .send(html)
        }

    }

    reply
        .type('text/html')
        .send(content);
});

let targetUrl
server.post('/geetest', (request, reply) => {
    const requesBody = JSON.parse(request.body)
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

    if (!tokenData || now - tokenData.createTime > 240 * 1000) {
        return false; //不存在则无效
    }

    return true; //有效
}

