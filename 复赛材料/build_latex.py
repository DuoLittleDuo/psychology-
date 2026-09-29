# -*- coding: utf-8 -*-
"""生成复赛《作品说明文档》LaTeX 源文件并编译为 PDF。

严格按官方模板规格：
  中文字体 宋体 | 标题 二号粗体 / 作者 三号粗体
  一级标题 三号 / 二级 四号 / 三级 小四 / 四级 五号(均粗体)
  正文 五号 | 单倍行距
  页边距 上下 2.5cm / 左右 3cm | A4 纵向 | 页码 页面底端 外侧

内容：参赛团队信息表 + 作品原创性声明 + 创意描述 + 设计稿 + 介绍文档
"""
import io
import os
import re
import subprocess
import sys

ROOT = r'D:\study-race\tast\psychology-'
MAT = os.path.join(ROOT, '复赛材料')
SHOTS = os.path.join(ROOT, '复赛设计稿', '效果图')
SIG = os.path.join(MAT, '签名')
TEX = os.path.join(MAT, '作品说明文档.tex')

TEXBIN = r'D:\install\latex\texlive\2026\bin\windows'


def tex_escape(s: str) -> str:
    """转义 LaTeX 特殊字符，并替换需要数学模式的符号。"""
    s = s.replace('\\', r'\textbackslash{}')
    for a, b in [('&', r'\&'), ('%', r'\%'), ('$', r'\$'), ('#', r'\#'),
                 ('_', r'\_'), ('{', r'\{'), ('}', r'\}')]:
        s = s.replace(a, b)
    s = s.replace('~', r'\textasciitilde{}')
    s = s.replace('^', r'\textasciicircum{}')
    # 这些符号 SimSun 未必有；xelatex 会自动回退字体，直接保留即可
    # （改用 $\surd$/$\rightarrow$ 等数学模式反而会让 pandoc 解析 .tex 时报错）
    s = s.replace('–', '--')
    return s


def to_path(p: str) -> str:
    """Windows 路径转 LaTeX 可用的正斜杠形式。"""
    return p.replace('\\', '/').replace('复赛设计稿', '复赛设计稿')


# ---------------------------------------------------------------- 读取内容
idea = io.open(os.path.join(MAT, '创意描述.txt'), encoding='utf-8').read().strip()
intro_md = io.open(os.path.join(MAT, '介绍文档.md'), encoding='utf-8').read()

# 介绍文档 Markdown -> LaTeX 段落
intro_blocks = []
for raw in intro_md.split('\n'):
    line = raw.rstrip()
    if not line.strip() or line.startswith('# '):
        continue
    if line.startswith('## '):
        intro_blocks.append(('h1', line[3:].strip()))
    elif line.startswith('### '):
        intro_blocks.append(('h2', line[4:].strip()))
    elif line.startswith('- '):
        intro_blocks.append(('item', line[2:].strip()))
    else:
        txt = re.sub(r'\*\*(.+?)\*\*', r'\\textbf{\1}', line)
        intro_blocks.append(('p', txt))

intro_tex = []
prev_was_heading = False
for kind, txt in intro_blocks:
    if kind == 'h1':
        intro_tex.append(r'\section*{%s}' % tex_escape(txt))
        prev_was_heading = True
    elif kind == 'h2':
        intro_tex.append(r'\subsection*{%s}' % tex_escape(txt))
        prev_was_heading = True
    elif kind == 'item':
        intro_tex.append(r'  \item %s' % tex_escape(txt))
        prev_was_heading = False
    else:
        # 紧跟标题的首段：ctex 的缩进会让长段多算 2em 而顶出版心
        # （实测右界 517.8 / 版心 511.8），故显式 \noindent。
        prefix = r'\noindent ' if prev_was_heading else ''
        intro_tex.append(prefix + tex_escape(txt) + '\n')
        prev_was_heading = False
# 连续 item 需要包在 itemize 里
merged = []
buf = []
for t in intro_tex:
    if t.startswith('  \\item'):
        buf.append(t)
    else:
        if buf:
            merged.append('\\begin{itemize}[leftmargin=1.6em,itemsep=2pt,topsep=2pt]\n'
                          + '\n'.join(buf) + '\n\\end{itemize}')
            buf = []
        merged.append(t)
if buf:
    merged.append('\\begin{itemize}[leftmargin=1.6em,itemsep=2pt,topsep=2pt]\n'
                  + '\n'.join(buf) + '\n\\end{itemize}')
intro_body = '\n'.join(merged)

# 设计稿图片：按宽高双约束
shot_files = [
    ('图 1  产品开场页', '01-开场页.png'),
    ('图 2  系统总览 · 状态输入台', '02-系统总览-状态输入台.png'),
    ('图 3  系统总览 · L1 决策矩阵（九宫格）', '03-系统总览-L1决策矩阵.png'),
    ('图 4  系统总览 · 记忆与深度规划', '04-系统总览-记忆与深度规划.png'),
    ('图 5  系统总览 · Agent 协作链', '05-系统总览-Agent协作链.png'),
    ('图 6  系统总览 · 多端执行结果', '06-系统总览-多端执行结果.png'),
    ('图 7  Agent 架构', '07-Agent架构.png'),
    ('图 8  安全响应（四级危机响应升级链）', '08-安全响应.png'),
    ('图 9  跨端流转', '09-跨端流转.png'),
]

from PIL import Image  # noqa: E402

shots_tex = []
for cap, fn in shot_files:
    path = os.path.join(SHOTS, fn)
    if not os.path.exists(path):
        continue
    with Image.open(path) as im:
        w, h = im.size
    ratio = h / w
    W, H = 15.0, 17.5          # cm，可用区约 15 x 24.7
    if W * ratio > H:          # 竖长图按高度定标
        W = H / ratio
    shots_tex.append(
        '\\begin{figure}[H]\n  \\centering\n'
        '  \\includegraphics[width=%.2fcm]{%s}\n'
        '  \\caption*{%s}\n\\end{figure}\n'
        % (W, path.replace('\\', '/'), tex_escape(cap))
    )

# ---------------------------------------------------------------- 生成 .tex
tex = r'''%% !TEX program = xelatex
%% 2026 中国高校计算机大赛—人工智能创意赛 · 鸿蒙赛道 · 作品说明文档
\documentclass[fontset=windows,a4paper,UTF8]{ctexart}

\usepackage{geometry}
\geometry{top=2.5cm,bottom=2.5cm,left=3cm,right=3cm,headsep=0.5cm,footskip=1cm}
\usepackage{xeCJK}
%% 允许在中英文/数字交界处断行。xeCJK 默认禁止在该处换行，
%% 导致"约有 2.2 名""经 MessageBus 异步"这类位置整行顶出版心。
\XeTeXlinebreaklocale "zh"
\XeTeXlinebreakskip = 0pt plus 1pt
\usepackage{graphicx}
\usepackage{adjustbox}
\usepackage{float}
\usepackage{array}
\usepackage{tabularx}
\usepackage{booktabs}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{fancyhdr}
\usepackage{caption}
\usepackage[hidelinks]{hyperref}

%% 行距：单倍（模板要求）
\linespread{1.0}
%% 中文习惯：首行缩进两字，段间不额外留白。
%% 注意：不要加载 indentfirst —— 它与 ctex 的缩进机制冲突，
%% 会让部分段落宽度算成 \textwidth + 2em，使整段顶出版心（实测右界 517.8）。
%% ctex 本身已对中文段落启用首行缩进，只需设定缩进量。
\setlength{\parindent}{2em}
\setlength{\parskip}{0pt}
%% 正文五号
\renewcommand{\normalsize}{\zihao{5}}
\AtBeginDocument{\zihao{5}}

%% 各级标题字号（模板规定）
\titleformat{\section}{\zihao{3}\bfseries}{\thesection、}{0.3em}{}
\titleformat{\subsection}{\zihao{4}\bfseries}{\thesubsection}{0.5em}{}
\titleformat{\subsubsection}{\zihao{-4}\bfseries}{\thesubsubsection}{0.5em}{}
\titlespacing*{\section}{0pt}{12pt}{8pt}
\titlespacing*{\subsection}{0pt}{8pt}{6pt}
\titlespacing*{\subsubsection}{0pt}{6pt}{4pt}
\setcounter{secnumdepth}{0}

%% 页码：页面底端、外侧
\pagestyle{fancy}
\fancyhf{}
\fancyfoot[RO,LE]{\zihao{5}\thepage}
\renewcommand{\headrulewidth}{0pt}

%% 中文断行容忍度：默认 \tolerance 偏严，长串英文/数字(如 MessageBus、
%% TypeScript)会顶出版心。放宽容忍并允许更多连断，让正文严格落在版心内。
\tolerance=2000
\emergencystretch=3em
\hbadness=10000
\sloppy

%% 图表题注：五号
\captionsetup{font={small},labelformat=empty,skip=4pt}

\begin{document}

%% ==================== 封面 ====================
\begin{center}
  \vspace*{1.2cm}
  {\zihao{2}\bfseries 2026中国高校计算机大赛}\\[8pt]
  {\zihao{2}\bfseries —人工智能创意赛}\\[10pt]
  {\zihao{2}\bfseries 鸿蒙赛道作品说明文档}\\[2.2cm]

  {\zihao{3}\bfseries 参赛学校：山东师范大学}\\[10pt]
  {\zihao{3}\bfseries 团队名称：airfree}\\[10pt]
  {\zihao{3}\bfseries 作品名称：“同频” Same Wavelength}\\[10pt]
  {\zihao{3}\bfseries 赛题方向：Agent 创新}\\[10pt]
  {\zihao{3}\bfseries 联系人（队长）：邓子祥}\\[10pt]
  {\zihao{3}\bfseries 联系电话（队长）：15656807075}
\end{center}
\clearpage

%% ==================== 目录 ====================
\begin{center}{\zihao{3}\bfseries 目\quad 录}\end{center}
\vspace{0.6cm}
\begin{itemize}[leftmargin=2em,itemsep=8pt]
  \item 一、参赛团队信息表
  \item 二、作品原创性声明
  \item 三、创意描述
  \item 四、设计稿
  \item 五、介绍文档
\end{itemize}
\clearpage

%% ==================== 一、参赛团队信息表 ====================
\section*{一、参赛团队信息表}

\renewcommand{\arraystretch}{1.35}
%% 顶部信息表用 resizebox 强制贴合 \textwidth。
%% 直接给列宽时，"赛题方向"那行内容比单元格宽 13pt 会撑出页面（实测右界 524.9
%% 而版心右界仅 511.8），故用 resizebox 按比例缩放整表，保证绝不溢出。
\noindent\resizebox{\textwidth}{!}{%
\begin{tabular}{|>{\bfseries}p{2.6cm}|p{11.3cm}|}
\hline
作品名称 & “同频” Same Wavelength \\
\hline
团队名称 & airfree \\
\hline
参赛学校 & 山东师范大学 \\
\hline
赛题方向 & （\quad）应用创新\quad（√）Agent 创新\quad（\quad）用户体验创新\quad（\quad）操作系统智能创新 \\
\hline
\end{tabular}%
}

\vspace{0.5cm}
{\zihao{-4}\bfseries （一）团队队员基本信息}

\vspace{0.2cm}
%% 九列在 15cm 版心内必然有折行：按六号字，专业全称(14字)需 3.6cm、
%% 院系需 2.8cm，两者已占 6.4cm。故改用加权 X 列，由 tabularx 精确
%% 分配到 \textwidth，从根本上避免超出页面（固定 p{} 宽度曾溢出 15pt）。
%% 权重之和 = 9（列数），保证总宽恰为 \textwidth。
{\zihao{6}
\renewcommand{\arraystretch}{2.0}
\noindent\resizebox{\textwidth}{!}{%
\begin{tabular}{|p{1.35cm}|p{2.55cm}|p{3.15cm}|p{3.60cm}|p{1.00cm}|p{1.80cm}|p{2.30cm}|p{3.55cm}|p{1.05cm}|}
\hline
\bfseries 姓名 & \bfseries 学校全称 & \bfseries 院（系）全称 & \bfseries 专业全称 & \bfseries 年级 & \bfseries 毕业时间 & \bfseries 联系电话 & \bfseries 邮箱 & \bfseries 分工 \\
\hline
邓子祥 & 山东师范大学 & 计算机与人工智能学院 & 人工智能 & 大三 & 2028.6 & 15656807075 & \mbox{256043794@qq.com} & 队长 \\
\hline
邓希语 & 山东师范大学 & 计算机与人工智能学院 & 计算机科学与技术（非师范） & 大二 & 2029.6 & 18721255866 & \mbox{2015853236@qq.com} & 队员 \\
\hline
\end{tabular}%
}
}

\vspace{0.2cm}
%% 与队员表同样用加权 X 列，确保总宽 = \textwidth（固定 p{} 曾溢出页面）。
%% 权重之和 = 6（列数）。
{\zihao{-5}
\renewcommand{\arraystretch}{1.7}
\noindent\resizebox{\textwidth}{!}{%
\begin{tabular}{|p{1.30cm}|p{3.60cm}|p{1.15cm}|p{1.80cm}|p{2.30cm}|p{3.95cm}|}
\hline
\bfseries 姓名 & \bfseries 院（系）全称 & \bfseries 职称 & \bfseries 研究方向 & \bfseries 联系电话 & \bfseries 联系邮箱 \\
\hline
刘冬梅 & 计算机与人工智能学院 & 讲师 & 电子信息 & 13589083387 & \mbox{liudm@sdnu.edu.cn} \\
\hline
\end{tabular}%
}
}

\vspace{0.5cm}
{\zihao{-4}\bfseries （三）团队成员优势描述}

\vspace{0.15cm}
队长曾获小米杯国奖、数学建模比赛省奖，具备完整项目从零到一的带队经验。队员有蓝桥杯省赛、数学建模比赛获奖经历，在算法设计与前端工程方向积累了扎实的实战能力。

队长擅长分布式系统架构设计与 TypeScript 工程化开发，在本项目中负责五大 Agent 联邦的整体架构规划、MessageBus 异步通信总线的搭建、感知 Agent 四大通道与记忆 Agent 三层存储体系的实现、决策 Agent 的 L2DeepPlanner 与 InterventionTimer 核心逻辑编码，以及安全层防护机制的设计。

队员擅长 React + TypeScript + Framer Motion 前端开发与产品叙事设计，负责可视化面板全站构建——功能滑动卡片、Agent 架构可视化页面、跨端设备演示组件、LetterSwap 交互动效及全局过渡动画；同时承担产品定位与用户场景梳理、鸿蒙生态竞品分析、市场前景评估，以及架构海报与品牌视觉体系输出。

\clearpage

%% ==================== 二、作品原创性声明 ====================
\section*{二、作品原创性声明}
{\zihao{4}\bfseries “同频” Same Wavelength 作品原创性声明}\\[6pt]

郑重声明：承诺本参赛队伍报名信息真实有效；呈交的参赛作品相关资料以及所完成的作品实物等相关成果，是本团队独立进行研究工作所取得的成果，除文中已经注明引用的内容外，本作品说明文档不包含任何其他个人或集体已经发表或撰写过的作品成果，不侵犯任何第三方的知识产权或其他权利。本声明的法律结果由本参赛队承担。

\vspace{0.6cm}
参赛队员签名（团队全部成员）：\\[4pt]
\noindent\includegraphics[width=5.8cm]{%%(sig_stu)s}

\vspace{0.1cm}
\begin{flushright}
日期：\quad 2026\quad 年\quad 9\quad 月\quad 29\quad 日
\end{flushright}

\vspace{0.7cm}
指导老师审核签名：\\[4pt]
\noindent\includegraphics[width=3.5cm]{%%(sig_tea)s}

\vspace{0.1cm}
\begin{flushright}
日期：\quad 2026\quad 年\quad 9\quad 月\quad 29\quad 日
\end{flushright}

\clearpage

%% ==================== 三、创意描述 ====================
\section*{三、创意描述}
%%(idea)s

%% ==================== 四、设计稿 ====================
\section*{四、设计稿}
以下为作品实际运行界面截图（视口 1600×1000），展示视觉设计与交互逻辑。

%%(shots)s
\clearpage

%% ==================== 五、介绍文档 ====================
\section*{五、介绍文档}
%%(intro)s

\end{document}
'''  # noqa: E501

# 用 replace 注入而非 %-格式化：模板里出现成对的 LaTeX 注释百分号或
# 宽度写法(如 0.265cm)时，%-格式化会误判为格式符并抛异常。
for _k, _v in {
    'sig_stu': os.path.join(SIG, '签名-队员.png').replace('\\', '/'),
    'sig_tea': os.path.join(SIG, '签名-教师.png').replace('\\', '/'),
    'idea': tex_escape(idea),
    'shots': '\n'.join(shots_tex),
    'intro': intro_body,
}.items():
    # 注意：模板中写的是字面量 %%(key)s（两个百分号）。不能用
    # '%%(%s)s' % _k 来构造查找串 —— %-格式化会把 %% 折叠成一个 %。
    tex = tex.replace('%%(' + _k + ')s', _v)

io.open(TEX, 'w', encoding='utf-8', newline='\n').write(tex)
print('已生成 LaTeX:', TEX)

# ---------------------------------------------------------------- 编译
env = dict(os.environ)
env['PATH'] = TEXBIN + os.pathsep + env.get('PATH', '')
for i in range(2):  # 两趟，保证页码/引用稳定
    r = subprocess.run(
        ['xelatex', '-interaction=nonstopmode', '-halt-on-error',
         os.path.basename(TEX)],
        cwd=MAT, env=env, capture_output=True, text=True,
        encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print('--- xelatex 第%d趟失败 ---' % (i + 1))
        tail = (r.stdout or '')[-3000:]
        print(tail)
        sys.exit(1)
    print('xelatex 第%d趟完成' % (i + 1))

pdf = os.path.join(MAT, '作品说明文档.pdf')
if os.path.exists(pdf):
    print('PDF 已生成:', pdf)


# ---------------------------------------------------------------- Word 版
# pandoc 从 .tex 转出的 docx 用的是它自己的默认样式，字体与页边距都不符合模板
# 要求。此处用 python-docx 后处理，使其与 LaTeX 排版结果一致。
def polish_docx(path):
    from docx import Document
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Cm, Pt, RGBColor

    FONT = '宋体'

    def set_cjk(style_or_run, size, bold=None):
        f = style_or_run.font
        f.name = FONT
        f.size = size
        if bold is not None:
            f.bold = bold
        f.color.rgb = RGBColor(0, 0, 0)
        rpr = style_or_run.element.get_or_add_rPr()
        rf = rpr.find(qn('w:rFonts'))
        if rf is None:
            rf = OxmlElement('w:rFonts')
            rpr.append(rf)
        for a in ('w:eastAsia', 'w:ascii', 'w:hAnsi'):
            rf.set(qn(a), FONT)

    d = Document(path)

    # 页面：A4 + 模板页边距
    for s in d.sections:
        s.page_width, s.page_height = Cm(21.0), Cm(29.7)
        s.top_margin = s.bottom_margin = Cm(2.5)
        s.left_margin = s.right_margin = Cm(3.0)
        s.header_distance = s.footer_distance = Cm(1.5)

    # 样式：正文五号，各级标题按模板
    st = d.styles
    set_cjk(st['Normal'], Pt(10.5))
    st['Normal'].paragraph_format.line_spacing = 1.0
    mapping = {
        'Title': Pt(22), 'Heading 1': Pt(16), 'Heading 2': Pt(14),
        'Heading 3': Pt(12), 'Heading 4': Pt(10.5),
    }
    for name, size in mapping.items():
        try:
            set_cjk(st[name], size, bold=True)
        except KeyError:
            pass

    # 正文段落统一五号、单倍行距
    for p in d.paragraphs:
        p.paragraph_format.line_spacing = 1.0
        for r in p.runs:
            if r.font.size is None:
                set_cjk(r, Pt(10.5))

    # 封面：pandoc 会把 LaTeX 的 {\zihao{2}...}\\[..] 整块拍平成一个段落，
    # 内部用换行分隔。故按换行拆开，逐行赋模板规定的字号。
    for p in d.paragraphs:
        lines = p.text.split('\n')
        if len(lines) > 3 and any('参赛学校' in ln for ln in lines):
            for r in list(p.runs):
                r._element.getparent().remove(r._element)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for i, ln in enumerate(lines):
                if not ln.strip():
                    continue
                # 前三行主标题 = 二号；其余(参赛学校/团队名称/…) = 三号
                size = Pt(22) if i < 3 else Pt(16)
                run = p.add_run(ln)
                set_cjk(run, size, bold=True)
                if i < len(lines) - 1:
                    run.add_break()
            break

    # 目录项：pandoc 拍平成正文，恢复为三号不加粗
    for p in d.paragraphs:
        t = p.text.strip()
        if t in ('目 录', '目录'):
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in p.runs:
                set_cjk(r, Pt(16), bold=True)

    d.save(path)
    print('Word 版已按模板规格后处理:', path)


docx_path = os.path.join(MAT, '01-作品说明文档+airfree.docx')
# 先由 LaTeX 源转出 Word（pandoc），再按模板规格后处理
try:
    for f in (docx_path, os.path.join(MAT, '~$1-作品说明文档+airfree.docx')):
        if os.path.exists(f):
            os.remove(f)
    r = subprocess.run(['pandoc', os.path.basename(TEX), '-o', os.path.basename(docx_path)],
                       cwd=MAT, env=env, capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print('! pandoc 转换失败:', (r.stderr or '')[-500:])
    else:
        print('Word 版已由 LaTeX 源生成')
except Exception as e:
    print('! pandoc 调用异常:', e)

if os.path.exists(docx_path):
    try:
        polish_docx(docx_path)
    except Exception as e:          # 后处理失败不应阻断 PDF 产出
        print('! Word 后处理失败:', e)
