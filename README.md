# geetest-manual-validator
极验手动验证服务器

## 接口
```
# 验证页面手动输入指定字段
[GET] /geetest

# 从url获取指定参数
[GET] /geetest?gt=xxx$chalenge=xxx

# 验证接口回调
[GET] /geetest?callback=验证码的challenge值

# 获取短链参数
1. 请求体中添加字段url发送POST请求到 /geetest 下发token
[POST] /geetest

# 短链
[GET] /geetest?e=token


```
## 手动输入
<img src="img/demo1.jpg" width="400" alt="样式1">
<img src="img/demo2.jpg" width="400" alt="样式1">
<img src="img/demo3.jpg" width="400" alt="样式1">  


### 魔改 https://github.com/Colter23/geetest-validator