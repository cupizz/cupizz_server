import nodemailer from 'nodemailer';
import { prisma } from '../server';
import { Validator } from '../utils/validator';

class MailService {
    public async sendMailToUser(userIds: string[], title: string, content: string) {
        if (userIds.length === 0) return;
        const emails = (await prisma.socialProvider.findMany({
            where: {
                userId: { in: userIds },
                type: { equals: 'email' }
            }
        })).map(e => e.id);

        await this.sendMail(emails, title, content);
    }
    public async sendMail(to: string[], title: string, content: string) {
        if (to.length === 0) return;
        to.forEach(e => Validator.email(e))

        let transporter = nodemailer.createTransport({
            host: "smtp.lolipop.jp",
            port: 465,
            auth: {
                user: 'l_hien@gonosen.asia',
                pass: 'eLud4fxYM-jr',
            },
        });

        await transporter.sendMail({
            from: '"Cupizz <support@cupizz.cf>',
            to: to.join(', '),
            subject: title,
            html: this._buildHtmlContent(content),
        });
    }

    private _buildHtmlContent(content: string) {
        return `
<style type="text/css">
    body {
        margin: 0;
        padding: 0;
    }

    table,
    td,
    tr {
        vertical-align: top;
        border-collapse: collapse;
    }

    * {
        line-height: inherit;
    }

    a[x-apple-data-detectors=true] {
        color: inherit !important;
        text-decoration: none !important;
    }
</style>
<style type="text/css" id="media-query">
    @media (max-width: 520px) {

        .block-grid,
        .col {
            min-width: 320px !important;
            max-width: 100% !important;
            display: block !important;
        }

        .block-grid {
            width: 100% !important;
        }

        .col {
            width: 100% !important;
        }

        .col_cont {
            margin: 0 auto;
        }

        img.fullwidth,
        img.fullwidthOnMobile {
            max-width: 100% !important;
        }

        .no-stack .col {
            min-width: 0 !important;
            display: table-cell !important;
        }

        .no-stack.two-up .col {
            width: 50% !important;
        }

        .no-stack .col.num2 {
            width: 16.6% !important;
        }

        .no-stack .col.num3 {
            width: 25% !important;
        }

        .no-stack .col.num4 {
            width: 33% !important;
        }

        .no-stack .col.num5 {
            width: 41.6% !important;
        }

        .no-stack .col.num6 {
            width: 50% !important;
        }

        .no-stack .col.num7 {
            width: 58.3% !important;
        }

        .no-stack .col.num8 {
            width: 66.6% !important;
        }

        .no-stack .col.num9 {
            width: 75% !important;
        }

        .no-stack .col.num10 {
            width: 83.3% !important;
        }

        .video-block {
            max-width: none !important;
        }

        .mobile_hide {
            min-height: 0px;
            max-height: 0px;
            max-width: 0px;
            display: none;
            overflow: hidden;
            font-size: 0px;
        }

        .desktop_hide {
            display: block !important;
            max-height: none !important;
        }
    }
</style>
<body class="clean-body" style="margin: 0; padding: 0; -webkit-text-size-adjust: 100%; background-color: #FFFFFF;">
<!--[if IE]><div class="ie-browser"><![endif]-->
<table class="nl-container" style="table-layout: fixed; vertical-align: top; min-width: 320px; border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #FFFFFF; width: 100%;" cellpadding="0" cellspacing="0" role="presentation" width="100%" bgcolor="#FFFFFF" valign="top">
    <tbody>
        <tr style="vertical-align: top;" valign="top">
            <td style="word-break: break-word; vertical-align: top;" valign="top">
                <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color:#FFFFFF"><![endif]-->
                <div style="background-color:transparent;">
                    <div class="block-grid " style="min-width: 320px; max-width: 500px; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; Margin: 0 auto; background-color: transparent;">
                        <div style="border-collapse: collapse;display: table;width: 100%;background-color:transparent;">
                            <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:500px"><tr class="layout-full-width" style="background-color:transparent"><![endif]-->
                            <!--[if (mso)|(IE)]><td align="center" width="500" style="background-color:transparent;width:500px; border-top: 0px solid transparent; border-left: 0px solid transparent; border-bottom: 0px solid transparent; border-right: 0px solid transparent;" valign="top"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right: 0px; padding-left: 0px; padding-top:5px; padding-bottom:5px;"><![endif]-->
                            <div class="col num12" style="min-width: 320px; max-width: 500px; display: table-cell; vertical-align: top; width: 500px;">
                                <div class="col_cont" style="width:100% !important;">
                                    <!--[if (!mso)&(!IE)]><!-->
                                    <div style="border-top:0px solid transparent; border-left:0px solid transparent; border-bottom:0px solid transparent; border-right:0px solid transparent; padding-top:5px; padding-bottom:5px; padding-right: 0px; padding-left: 0px;">
                                        <!--<![endif]-->
                                        ${content}
                                        <!--[if mso]></td></tr></table><![endif]-->
                                        <!--[if (!mso)&(!IE)]><!-->
                                    </div>
                                    <!--<![endif]-->
                                </div>
                            </div>
                            <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
                            <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
                        </div>
                    </div>
                </div>
                <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
            </td>
        </tr>
    </tbody>
</table>
<!--[if (IE)]></div><![endif]-->
</body>`;
    }
}

const _ = new MailService();
export { _ as MailService };