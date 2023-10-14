window.onload = function () {
    const wait = document.querySelector("#wait")
    const genBtn = document.querySelector("#gen")
    const successBtn = document.querySelector("#success")
    const resultBox = document.querySelector("#result")
    const resultBtn = document.querySelector("#result-btn")
    const toastBox = document.querySelector(".toast-box")

    const gtInput = document.querySelector("#gt")
    const challengeInput = document.querySelector("#challenge")
    const validateInput = document.querySelector("#validate")
    const seccodeInput = document.querySelector("#seccode")

    class GeeTest {
        constructor(gt, challenge) {
            this.gt = gt;
            this.challenge = challenge;
        }

        init(now = false) {
            initGeetest({
                gt: this.gt,
                challenge: this.challenge,
                offline: false,
                new_captcha: true,

                product: now ? "bind" : "popup",
                width: "100%",
            }, function (captchaObj) {
                if (now) setTimeout(() => {
                    hide(wait);
                    captchaObj.verify();
                }, Math.floor(Math.random() * 2000) + 1000);
                else captchaObj.appendTo("#captcha");

                captchaObj.onReady(() => {
                    if (!now) hide(wait);
                }).onSuccess(() => {
                    const result = captchaObj.getValidate();
                    validateInput.value = result.geetest_validate;
                    seccodeInput.value = result.geetest_seccode;
                    try {
                        const gt = gtInput.value
                        const challenge = challengeInput.value;
                        const seccode = seccodeInput.value;
                        const validate = validateInput.value
                        const serverUrl = 'http://localhost:3001';
                        // 调用接口发送参数
                        fetch(`${serverUrl}/updateResult`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                              },
                            body: JSON.stringify({
                                gt,
                                challenge,
                                validate,
                                seccode
                            })
                        });
                    } catch (err) {
                        console.log(err)
                    }

                    showToastBox("验证成功！你现在可以关闭这个页面了");
                    if (now) {
                        hide(wait);
                        show(successBtn);
                    }
                    show(resultBox)
                }).onError(err => {
                    showToastBox("验证失败 " + err.msg, 3000);
                    if (now) {
                        hide(wait);
                        show(genBtn);
                    }
                });
            });
        }
    }

    genBtn.onclick = () => {
        let gt = gtInput.value;
        let challenge = challengeInput.value;
        if (gt === undefined || gt === '' || challenge === undefined || challenge === '') {
            console.log("gt 和 challenge 不能为空");
            showToastBox("gt 和 challenge 不能为空", 3000);
            return;
        }
        if (gt.length !== 32 || challenge.length !== 32) {
            console.log("gt 或 challenge 长度错误");
            showToastBox("gt 或 challenge 长度错误", 3000);
            return;
        }

        hide(genBtn);
        show(wait);

        new GeeTest(gt, challenge).init(true);
    }

    const search = location.search;

    if (search !== '') {
        hide(genBtn);
        show(wait);

        let gt = '';
        let challenge = '';

        const arr = search.substring(1).split("&");
        for (const i in arr) {
            const t = arr[i].split("=");
            switch (t[0]) {
                case "gt": gt = t[1]; break;
                case "challenge": challenge = t[1]; break;
                default: break;
            }
        }
        if (gt !== '' && challenge !== '') {
            gtInput.value = gt;
            challengeInput.value = challenge;
            new GeeTest(gt, challenge).init();
        } else {
            console.log("未从URL中找到 gt 与 challenge");
            hide(wait);
            show(genBtn);
        }
    }

    resultBtn.onclick = () => {
        const text = "validate=" + validateInput.value + "&seccode=" + seccodeInput.value
        const clipboard = navigator.clipboard
        if (clipboard === undefined) {
            const el = document.createElement('input');
            el.setAttribute('value', text);
            document.body.appendChild(el);
            el.select();
            const res = document.execCommand('copy');
            document.body.removeChild(el);
            showToastBox(res ? "复制成功" : "复制失败");
        } else clipboard.writeText(text).then(() => {
            console.log("复制成功");
            showToastBox("复制成功");
        }, err => {
            console.log("复制失败");
            console.log(err);
            showToastBox("复制失败");
        });

    }

    let timer = null
    function showToastBox(text, timeout = 2000) {
        toastBox.innerHTML = text;
        toastBox.style.opacity = 1;
        toastBox.style.top = '50px';
        if (timer != null) clearTimeout(timer)
        timer = setTimeout(() => {
            toastBox.style.top = '-30px';
            toastBox.style.opacity = 0;
        }, timeout)
    }

    function hide(el) {
        el.classList.add("hide")
    }

    function show(el) {
        el.classList.remove("hide")
    }
}
