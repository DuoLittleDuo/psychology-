"""生成复赛《作品说明文档》docx。

严格按官方模板规格：
  字体 宋体 | 标题 二号粗体 / 作者 三号粗体
  一级标题 三号 / 二级 四号 / 三级 小四 / 四级 五号(均粗体)
  正文 五号 | 单倍行距
  页边距 上下 2.5cm / 左右 3cm | A4 纵向 | 页码 页面底端 外侧

内容：参赛团队信息表 + 作品原创性声明 + 创意描述 + 设计稿 + 介绍文档
"""
import io
import os
import re

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = r'D:\study-race\tast\psychology-'
MAT = os.path.join(ROOT, '复赛材料')
SHOTS = os.path.join(ROOT, '复赛设计稿', '效果图')
OUT = os.path.join(MAT, '01-作品说明文档+airfree.docx')

FONT = '宋体'
SZ_TITLE = Pt(22)    # 二号
SZ_AUTHOR = Pt(16)   # 三号
SZ_H1 = Pt(16)       # 三号
SZ_H2 = Pt(14)       # 四号
SZ_H3 = Pt(12)       # 小四
SZ_BODY = Pt(10.5)   # 五号


def set_font(run, size, bold=False):
    run.font.size = size
    run.font.bold = bold
    run.font.name = FONT
    run.font.color.rgb = RGBColor(0, 0, 0)
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts')
        rpr.append(rf)
    rf.set(qn('w:eastAsia'), FONT)
    rf.set(qn('w:ascii'), FONT)
    rf.set(qn('w:hAnsi'), FONT)


def para(doc, text, size=SZ_BODY, bold=False, align=None, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.space_after = Pt(space_after)
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    set_font(r, size, bold)
    return p


def add_shot(doc, cap, path, max_w_cm=15.0, max_h_cm=17.5):
    """按宽高双约束插入图片。

    竖长截图(如 1600x3095 的整页长图)若只按宽度缩放,高度会超出可打印区
    (A4 减页边距后约 24.7cm)而被挤出版面。故此处同时约束高度。
    """
    if not os.path.exists(path):
        return
    from PIL import Image
    with Image.open(path) as im:
        iw, ih = im.size
    ratio = ih / iw
    w = max_w_cm
    h = w * ratio
    if h > max_h_cm:                 # 高度超限则改为按高度定标
        h = max_h_cm
        w = h / ratio
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(4)
    p.add_run().add_picture(path, width=Cm(w))
    para(doc, cap, Pt(9), False, WD_ALIGN_PARAGRAPH.CENTER, 12)


def add_page_numbers(section):
    """页码置于页面底端、外侧对齐。"""
    footer = section.footer
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT  # 外侧（纵向文档取右）
    run = p.add_run()
    set_font(run, Pt(9))
    fld = OxmlElement('w:fldSimple')
    fld.set(qn('w:instr'), 'PAGE')
    run._element.addnext(fld)


doc = Document()

# ---- 页面设置：A4 纵向，页边距 上下2.5 左右3 ----
sec = doc.sections[0]
sec.page_width = Cm(21.0)
sec.page_height = Cm(29.7)
sec.top_margin = Cm(2.5)
sec.bottom_margin = Cm(2.5)
sec.left_margin = Cm(3)
sec.right_margin = Cm(3)
sec.header_distance = Cm(1.5)
sec.footer_distance = Cm(1.5)
add_page_numbers(sec)

# ---- 正文默认样式 ----
style = doc.styles['Normal']
style.font.name = FONT
style.font.size = SZ_BODY
style.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)

# ==================== 封面 ====================
para(doc, '2026中国高校计算机大赛—人工智能创意赛', SZ_TITLE, True, WD_ALIGN_PARAGRAPH.CENTER, 18)
para(doc, '鸿蒙赛道作品说明文档', SZ_TITLE, True, WD_ALIGN_PARAGRAPH.CENTER, 30)

for line in [
    '参赛学校：山东师范大学',
    '团队名称：airfree',
    '作品名称：“同频” Same Wavelength',
    '赛题方向：Agent 创新',
    '联系人（队长）：邓子祥',
    '联系电话（队长）：15656807075',
]:
    para(doc, line, SZ_AUTHOR, True, WD_ALIGN_PARAGRAPH.CENTER, 10)

doc.add_page_break()

# ==================== 目录 ====================
para(doc, '目  录', SZ_H1, True, WD_ALIGN_PARAGRAPH.CENTER, 16)
for t in ['一、参赛团队信息表', '二、作品原创性声明', '三、创意描述',
          '四、设计稿', '五、介绍文档']:
    para(doc, t, SZ_BODY, False, None, 6)

doc.add_page_break()

# ==================== 一、参赛团队信息表 ====================
para(doc, '一、参赛团队信息表', SZ_H1, True, None, 12)

info = [
    ('作品名称', '“同频” Same Wavelength'),
    ('团队名称', 'airfree'),
    ('参赛学校', '山东师范大学'),
    ('赛题方向', '（ ）应用创新  （√）Agent 创新  （ ）用户体验创新  （ ）操作系统智能创新'),
]
t = doc.add_table(rows=0, cols=2)
t.style = 'Table Grid'
for k, v in info:
    row = t.add_row().cells
    for cell, txt, bold in ((row[0], k, True), (row[1], v, False)):
        cp = cell.paragraphs[0]
        cp.paragraph_format.line_spacing = 1.0
        set_font(cp.add_run(txt), SZ_BODY, bold)
t.columns[0].width = Cm(3.2)
t.columns[1].width = Cm(11.8)

para(doc, '', SZ_BODY, False, None, 2)
para(doc, '（一）团队队员基本信息', SZ_H3, True, None, 6)

hdr = ['姓名', '学校全称', '院（系）全称', '专业全称', '年级', '毕业时间', '联系电话', '邮箱', '团队分工']
members = [
    ['邓子祥', '山东师范大学', '计算机与人工智能学院', '人工智能', '大二', '2028.6', '15656807075', '256043794@qq.com', '队长'],
    ['邓希语', '山东师范大学', '计算机与人工智能学院', '计算机科学与技术（非师范）', '大一', '2029.6', '18721255866', '2015853236@qq.com', '队员'],
]
t2 = doc.add_table(rows=1, cols=len(hdr))
t2.style = 'Table Grid'
t2.autofit = False
# 九列需显式定宽,否则等分会把"专业全称"挤成竖排
widths = [1.6, 2.0, 2.4, 2.6, 1.0, 1.4, 2.0, 2.6, 1.3]  # 合计约 16.9cm,略收后适配正文区
for i, h in enumerate(hdr):
    cp = t2.rows[0].cells[i].paragraphs[0]
    cp.paragraph_format.line_spacing = 1.0
    set_font(cp.add_run(h), Pt(8), True)
for m in members:
    cells = t2.add_row().cells
    for i, v in enumerate(m):
        cp = cells[i].paragraphs[0]
        cp.paragraph_format.line_spacing = 1.0
        set_font(cp.add_run(v), Pt(8), False)
for row in t2.rows:
    for i, cell in enumerate(row.cells):
        cell.width = Cm(widths[i])

para(doc, '', SZ_BODY, False, None, 2)
para(doc, '（二）团队指导教师信息（指导教师须与队长同校）', SZ_H3, True, None, 6)

th = ['姓名', '院（系）全称', '职称', '研究方向', '联系电话', '联系邮箱']
t3 = doc.add_table(rows=1, cols=len(th))
t3.style = 'Table Grid'
for i, h in enumerate(th):
    cp = t3.rows[0].cells[i].paragraphs[0]
    cp.paragraph_format.line_spacing = 1.0
    set_font(cp.add_run(h), Pt(9), True)
cells = t3.add_row().cells
for i, v in enumerate(['刘冬梅', '计算机与人工智能学院', '讲师', '电子信息', '13589083387', 'liudm@sdnu.edu.cn']):
    cp = cells[i].paragraphs[0]
    cp.paragraph_format.line_spacing = 1.0
    set_font(cp.add_run(v), Pt(9), False)

para(doc, '', SZ_BODY, False, None, 2)
para(doc, '（三）团队成员优势描述', SZ_H3, True, None, 6)
for line in [
    '队长曾获小米杯国奖、数学建模比赛省奖，具备完整项目从零到一的带队经验。队员有蓝桥杯省赛、数学建模比赛获奖经历，在算法设计与前端工程方向积累了扎实的实战能力。',
    '队长擅长分布式系统架构设计与 TypeScript 工程化开发，在本项目中负责五大 Agent 联邦的整体架构规划、MessageBus 异步通信总线的搭建、感知 Agent 四大通道与记忆 Agent 三层存储体系的实现、决策 Agent 的 L2DeepPlanner 与 InterventionTimer 核心逻辑编码，以及安全层防护机制的设计。',
    '队员擅长 React + TypeScript + Framer Motion 前端开发与产品叙事设计，负责可视化面板全站构建——功能滑动卡片、Agent 架构可视化页面、跨端设备演示组件、LetterSwap 交互动效及全局过渡动画；同时承担产品定位与用户场景梳理、鸿蒙生态竞品分析、市场前景评估，以及架构海报与品牌视觉体系输出。',
]:
    para(doc, line, SZ_BODY, False, None, 4)

doc.add_page_break()

# ==================== 二、作品原创性声明 ====================
para(doc, '二、作品原创性声明', SZ_H1, True, None, 12)
para(doc, '“同频” Same Wavelength 作品原创性声明', SZ_H2, True, None, 10)
para(doc, '郑重声明：承诺本参赛队伍报名信息真实有效；呈交的参赛作品相关资料以及所完成的作品实物等相关成果，是本团队独立进行研究工作所取得的成果，除文中已经注明引用的内容外，本作品说明文档不包含任何其他个人或集体已经发表或撰写过的作品成果，不侵犯任何第三方的知识产权或其他权利。本声明的法律结果由本参赛队承担。', SZ_BODY, False, None, 14)
para(doc, '参赛队员签名（团队全部成员）：', SZ_BODY, False, None, 18)
para(doc, '日期：      年     月     日', SZ_BODY, False, None, 24)
para(doc, '指导老师审核签名：', SZ_BODY, False, None, 18)
para(doc, '日期：      年     月     日', SZ_BODY, False, None, 10)

doc.add_page_break()

# ==================== 三、创意描述 ====================
para(doc, '三、创意描述', SZ_H1, True, None, 12)
idea = io.open(os.path.join(MAT, '创意描述.txt'), encoding='utf-8').read().strip()
para(doc, idea, SZ_BODY, False, None, 10)

# ==================== 四、设计稿 ====================
para(doc, '四、设计稿', SZ_H1, True, None, 12)
para(doc, '以下为作品实际运行界面截图（视口 1600×1000），展示视觉设计与交互逻辑。', SZ_BODY, False, None, 10)

shots = [
    ('图 1  产品开场页', '01-开场页.png'),
    ('图 2  系统总览 · 状态输入台', '02-系统总览-状态输入台.png'),
    ('图 3  系统总览 · L1 决策矩阵（九宫格）', '03-系统总览-L1决策矩阵.png'),
]
for cap, fn in shots:
    add_shot(doc, cap, os.path.join(SHOTS, fn))

doc.add_page_break()

shots2 = [
    ('图 4  系统总览 · 记忆与深度规划', '04-系统总览-记忆与深度规划.png'),
    ('图 5  系统总览 · Agent 协作链', '05-系统总览-Agent协作链.png'),
    ('图 6  系统总览 · 多端执行结果', '06-系统总览-多端执行结果.png'),
    ('图 7  Agent 架构', '07-Agent架构.png'),
    ('图 8  安全响应（四级危机响应升级链）', '08-安全响应.png'),
    ('图 9  跨端流转', '09-跨端流转.png'),
]
for cap, fn in shots2:
    add_shot(doc, cap, os.path.join(SHOTS, fn))

doc.add_page_break()

# ==================== 五、介绍文档 ====================
para(doc, '五、介绍文档', SZ_H1, True, None, 12)

md = io.open(os.path.join(MAT, '介绍文档.md'), encoding='utf-8').read()
for raw in md.split('\n'):
    line = raw.rstrip()
    if not line.strip():
        continue
    if line.startswith('# '):
        continue
    if line.startswith('## '):
        para(doc, line[3:].strip(), SZ_H2, True, None, 8)
    elif line.startswith('### '):
        para(doc, line[4:].strip(), SZ_H3, True, None, 6)
    elif line.startswith('- '):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(3)
        set_font(p.add_run(line[2:].strip()), SZ_BODY)
    else:
        # 去掉 markdown 强调标记
        txt = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
        para(doc, txt, SZ_BODY, False, None, 6)

doc.save(OUT)
print('已生成:', OUT)
print('段落数:', len(doc.paragraphs), '| 表格数:', len(doc.tables))
