// 使用 Resend 发送邮件服务
export async function sendVerificationEmail(email, code, env) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'noreply@235800.xyz',
            to: email,
            subject: '诗意山河 - 邮箱验证码',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #c9a227; text-align: center;">诗意山河</h2>
          <div style="background: #fdf8e3; padding: 30px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #8b4513;">您的验证码</h3>
            <p style="font-size: 32px; font-weight: bold; color: #c9a227; text-align: center; letter-spacing: 8px; margin: 30px 0;">
              ${code}
            </p>
            <p style="color: #666; font-size: 14px;">验证码有效期为 10 分钟,请勿泄露给他人。</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            如果这不是您的操作,请忽略此邮件。
          </p>
        </div>
      `
        })
    });

    return await response.json();
}

// 生成 6 位验证码 
export function generateVerificationCode() {
    const array = new Uint8Array(3);
    crypto.getRandomValues(array);

    // 将3个字节转换为6位数字
    let code = '';
    for (let i = 0; i < array.length; i++) {
        code += array[i].toString().padStart(3, '0');
    }

    // 取前6位并确保是6位数字
    return (parseInt(code.slice(0, 6)) % 900000 + 100000).toString();
}