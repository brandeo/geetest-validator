import ddddocr
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import requests
import time
import random
import re
import json
import asyncio
import execjs
import argparse

f = open("demo.cjs", "r", encoding="utf-8")
htmlstr = f.read()
ctx = execjs.compile(htmlstr)
f.close()

timestamp = str(int(time.time() * 1000))
random_digits = str(random.randint(0, 9999999999)).zfill(11)
random_num = timestamp + random_digits


URL = [
    "https://www.geetest.com/demo/gt/register-icon",
    "http://api.geetest.com/gettype.php",
    "http://api.geetest.com/get.php",
    "http://apiv6.geetest.com/ajax.php",
    "http://apiv6.geetest.com/get.php",
]
    

async def geetest(gt, challenge):
    try:
        if gt == None and challenge == None:
            # gt、challenge
            params = {"t": timestamp, "random_num": random_num}
            data = fetch(URL[0], params=params)
            gt = data.get('gt')
            challenge = data.get('challenge')

        params = {"gt": gt, "challenge": challenge}
        data = fetch(URL[1], params=params, jsonp=True)

        params = {"gt": gt, "challenge": challenge, "lang": "zh-cn", "pt": 0, "w": "", "callback": "geetest_" + random_num}
        data = fetch(URL[2], params=params, jsonp=True)
        
        
        params = {"gt": gt, "challenge": challenge, "lang": "zh-cn", "pt": 0, "w": "", "callback": "geetest_" + random_num}
        data = fetch(URL[3], params=params, jsonp=True)
        
        # c、s、pic (c和s的值只能使用一次，)
        params = {"is_next": "ture", "type": "click", "gt": gt, "challenge": challenge, "lang": "zh-cn", "https": "false", "offline": "false", "product": "embed", "api_server": "apiv6.geetest.com", "isPC": "true", "autoReset": "true", "width": "100%", "callback": "geetest_" + random_num}
        data = fetch(URL[4], params=params, jsonp=True)

        # w值加密
        fulldata = {
            "gt": gt,
            "challenge": challenge,
            "c": data['data'].get("c"),
            "s": data['data'].get("s"),
            "pic": data['data'].get("pic"),
            "pic_url": "http://" + data['data']['static_servers'][0].rstrip('/')  + data['data'].get("pic")
        }
        # 保存图片
        pic_data = requests.get(fulldata["pic_url"]).content
        with open("test.jpg", "wb") as f:
          f.write(pic_data)
          time.sleep(2)
        # 识别坐标
        zuobiao = Ddddocr().case_demo(fulldata["pic_url"])
        final_zuobiao = {}
        formatted_zuobiao = ""
        for key, value in zuobiao.items():
           x, y = value
           final_x = int(round(x / 333.375 *100 * 100, 0))
           final_y = int(round(y / 333.375 *100 * 100, 0))
           final_zuobiao[key] = (final_x, final_y)
           formatted_zuobiao += f"{final_x}_{final_y},"
        # 去掉最后一个逗号
        formatted_zuobiao = formatted_zuobiao.rstrip(',')
        zuobiao = formatted_zuobiao
        fulldata["zuobiao"] = zuobiao
        w = await call_demo_cjs(fulldata["gt"], fulldata["challenge"], fulldata["pic"], fulldata["zuobiao"], fulldata["c"], fulldata["s"])
        fulldata["w"] = w
        
        # 验证
        params = {"gt": gt, "challenge": challenge, "lang": "zh-cn", "pt": 0, "client_type": "web", "w": fulldata["w"], "callback": "geetest_" + random_num}
        data = fetch(URL[3], params=params, jsonp=True)
        try:
              validate = data['data']['validate']
              print(validate)
        except KeyError:
              print("error")

        return validate
            
    except requests.exceptions.RequestException as e:
        print(f"发生错误: {e}")

async def call_demo_cjs(gt, challenge, pic, zuobiao, ccc, sss):
        w = ctx.call('get_w', gt, challenge, pic, zuobiao, ccc, sss)
        return w


def fetch(url, params=None, headers=None, jsonp = None, timeout=10):
    """
    发送GET请求的函数

    参数:
    - url: 请求的URL
    - params: 请求参数，可以是字典或字符串形式
    - headers: 请求头，可以是字典形式
    - timeout: 请求超时时间，默认为10秒
    - jsonp: 响应数据是否为jsonp

    返回:
    - 如果请求成功，返回解析后的JSON数据
    - 如果请求失败，返回None
    """
    try:
        # 发送GET请求
        response = requests.get(url, params=params, headers=headers, timeout=timeout)

        # 检查响应状态码
        response.raise_for_status()

        if jsonp == True :
                data = response.text
                # 使用正则表达式提取出 JSON 数据
                match = re.search(r'.*?({.*}).*', data)
                response = json.loads(match.group(1))
        else: response = response.json()
        

        # 返回解析后的JSON数据
        return response

    except requests.exceptions.RequestException as e:
        # 捕获请求异常
        print(f"Request Exception: {e}")
        return None
    

class Ddddocr:

    def __init__(self):
        self.ocr = ddddocr.DdddOcr(show_ad=False)
        self.xy_ocr = ddddocr.DdddOcr(det=True, show_ad=False)

    def ddddocr_identify(self, captcha_bytes):
        return self.ocr.classification(captcha_bytes)

    def draw_img(self, content, xy_list):
        """画出图片"""
        # 填字字体
        font_type = "AGENCYB.TTF"
        font_size = 20
        font = ImageFont.truetype(font_type, font_size)
        # 识别
        img = Image.open(BytesIO(content))
        draw = ImageDraw.Draw(img)
        words = []
        index = 0
        for row in xy_list:
            # 框字
            x1, y1, x2, y2 = row
            draw.line(([(x1, y1), (x1, y2), (x2, y2), (x2, y1), (x1, y1)]), width=4, fill="red")
            # 裁剪出单个字
            corp = img.crop(row)
            img_byte = BytesIO()
            corp.save(img_byte, 'png')
            # 识别出单个字
            word = self.ocr.classification(img_byte.getvalue())
            words.append(word)
            # 填字
            y = y1 - 30 if y2 > 300 else y2
            # draw.text((int((x1 + x2)/2), y), word, font=font, fill="red")
            draw.text((int((x1 + x2)/2), y), str(index), font=font, fill="red")
            index += 1
        # img.show()
        return words

    def ddddocr_clcik_identify(self, content, crop_size=None):
        """目标检测识别"""
        img = Image.open(BytesIO(content))
        # print(img.size)
        if crop_size:
            img = img.crop(crop_size)
            img_byte = BytesIO()
            img.save(img_byte, 'png')
            content = img_byte.getvalue()
        xy_list = self.xy_ocr.detection(content)
        words = self.draw_img(content, xy_list)
        return dict(zip(words, xy_list))

    def case_demo(self, img_url):
        # 内部下载验证码图片    
        resp = requests.get(img_url) 
        img_bytes = resp.content
        """点选识别结果"""
        click_identify_result = self.ddddocr_clcik_identify(img_bytes , (0, 0, 344, 344))
        img = Image.open(BytesIO(img_bytes ))
        img = img.crop((0, 344, 344, 384))
        img_byte = BytesIO()
        img.save(img_byte, 'png')
        identify_words = self.ocr.classification(img_byte.getvalue())
        print("1", click_identify_result)
        # words_dict = {}
        # for word in identify_words:
        #     words_dict[word] = click_identify_result.get(word)
        # print(words_dict)
        img_xy = {}
        for key, xy in click_identify_result.items():
            img_xy[key] = (int((xy[0] + xy[2]) / 2), int((xy[1] + xy[3]) / 2))
        print(img_xy)
        return(img_xy)



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('gt')
    parser.add_argument('challenge')
    args = parser.parse_args()
    asyncio.run(geetest(args.gt, args.challenge))