from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
from PyPDF2 import PdfMerger
from reportlab.pdfgen import canvas
import pandas as pd
import numpy as np
import os
import uuid
import time
from paddleocr import PaddleOCR
from io import BytesIO
from pdf2docx import Converter
import difflib
import json
import base64
import zipfile
import py7zr
import shutil
import datetime
import re
import string
import sys
import hashlib
import PyPDF2

app = Flask(__name__)
CORS(app)

# 全局配置临时文件夹，确保它存在
app.config['TEMP_FOLDER'] = os.path.join(os.path.dirname(__file__), 'temp')
os.makedirs(app.config['TEMP_FOLDER'], exist_ok=True)

# 配置文件上传
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'txt', 'zip', '7z'}
MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# 确保目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# 存储上传的图片信息
uploads = {}

# 存储上传的文件信息
compression_files = {}

# 初始化OCR模型
ocr = PaddleOCR(use_angle_cls=True, lang="ch", use_gpu=False)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# =============== 图片转Excel功能 ===============

@app.route('/image-to-excel', methods=['POST'])
def image_to_excel():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': '未找到图片'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'message': '未选择文件'}), 400
    
    if file and allowed_file(file.filename):
        # 生成唯一文件名
        filename = secure_filename(file.filename)
        timestamp = int(time.time())
        unique_id = f"{timestamp}_{uuid.uuid4().hex[:8]}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{unique_id}_{filename}")
        file.save(file_path)
        
        try:
            # 使用PaddleOCR识别图片中的表格
            result = ocr.ocr(file_path, cls=True)
            
            # 提取文本和位置信息
            boxes = []
            texts = []
            for line in result:
                for item in line:
                    box = item[0]  # 坐标
                    text = item[1][0]  # 文本内容
                    boxes.append(box)
                    texts.append(text)
            
            # 根据位置信息排列成表格
            # 提取y坐标作为行标识
            y_centers = [sum([box[1][1], box[2][1]]) / 2 for box in boxes]
            
            # 聚类y坐标，将接近的坐标归为一行
            y_tolerance = 20  # 容差值，可根据实际情况调整
            rows = []
            current_row = [0]
            for i in range(1, len(y_centers)):
                if abs(y_centers[i] - y_centers[current_row[0]]) < y_tolerance:
                    current_row.append(i)
                else:
                    rows.append(current_row)
                    current_row = [i]
            if current_row:
                rows.append(current_row)
            
            # 对每行内的元素按x坐标排序
            table_data = []
            for row_indices in rows:
                # 提取该行的所有文本和对应的x坐标
                row_boxes = [boxes[i] for i in row_indices]
                row_texts = [texts[i] for i in row_indices]
                
                # 计算x中心坐标
                x_centers = [sum([box[0][0], box[1][0]]) / 2 for box in row_boxes]
                
                # 根据x坐标排序
                sorted_indices = np.argsort(x_centers)
                sorted_texts = [row_texts[i] for i in sorted_indices]
                
                table_data.append(sorted_texts)
            
            # 创建Excel文件
            df = pd.DataFrame(table_data)
            
            # 确保所有列有相同数量的元素
            max_cols = max([len(row) for row in table_data]) if table_data else 0
            
            # 生成Excel文件
            excel_name = f"excel_{unique_id}.xlsx"
            excel_path = os.path.join(app.config['OUTPUT_FOLDER'], excel_name)
            df.to_excel(excel_path, index=False, header=False)
            
            # 生成下载URL
            excel_url = f"https://excel.sube.top/download/{excel_name}"
            
            # 返回结果
            return jsonify({
                'success': True,
                'data': {
                    'rows': len(table_data),
                    'columns': max_cols,
                    'excelUrl': excel_url
                }
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': f'处理表格失败: {str(e)}'}), 500
        finally:
            # 清理上传的图片
            try:
                os.remove(file_path)
            except:
                pass
    
    return jsonify({'success': False, 'message': '不支持的文件类型'}), 400

# =============== 图片转PDF功能 ===============

@app.route('/image-to-pdf-upload', methods=['POST'])
def upload_image_for_pdf():
    try:
        if 'image' not in request.files:
            response = jsonify({'success': False, 'message': '没有上传图片'})
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        image_file = request.files['image']
        if not image_file or not image_file.filename:
            response = jsonify({'success': False, 'message': '无效的图片文件'})
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        # 安全处理文件名
        original_filename = image_file.filename
        filename = secure_filename(original_filename)
        
        # 创建唯一的文件名避免冲突
        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{filename}"
        
        # 保存图片文件
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        image_file.save(filepath)
        
        # 返回成功响应
        result = {
            'success': True,
            'data': {
                'originalFilename': original_filename,
                'filename': unique_filename,
                'url': f"https://excel.sube.top/uploads/{unique_filename}"
            }
        }
        
        response = jsonify(result)
        response.headers['Content-Type'] = 'application/json'
        return response
    
    except Exception as e:
        error_message = f"上传图片失败: {str(e)}"
        print(error_message)
        response = jsonify({'success': False, 'message': error_message})
        response.headers['Content-Type'] = 'application/json'
        return response, 500

@app.route('/merge-pdf', methods=['POST'])
def merge_pdf():
    try:
        data = request.json
        image_ids = data.get('imageIds', [])
        
        if not image_ids or not isinstance(image_ids, list) or len(image_ids) == 0:
            response = jsonify({'success': False, 'message': '图片ID或文件名无效'})
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        # 尝试两种方式查找图片：
        # 1. 通过uploads字典中的ID（旧方法）
        # 2. 通过文件名直接查找（新方法）
        images = []
        
        # 首先尝试通过uploads字典查找
        for img_id in image_ids:
            if img_id in uploads:
                images.append({'id': img_id, 'path': uploads[img_id]['path'], 'index': uploads[img_id]['index']})
                
        # 如果没有找到图片，尝试通过文件名查找
        if not images:
            print("通过uploads字典未找到图片，尝试通过文件名查找")
            for filename in image_ids:
                # 检查是否是文件名
                if isinstance(filename, str) and ('.' in filename):
                    # 构建完整路径
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    # 检查文件是否存在
                    if os.path.exists(file_path):
                        # 根据字符串在列表中的位置确定索引
                        index = image_ids.index(filename)
                        images.append({'id': f"file-{index}", 'path': file_path, 'index': index})
        
        if not images:
            response = jsonify({'success': False, 'message': '未找到有效图片'})
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        # 按索引排序图片
        images.sort(key=lambda x: x['index'])
        
        # 生成PDF
        pdf_name = f"pdf-{int(time.time())}.pdf"
        pdf_path = os.path.join(app.config['OUTPUT_FOLDER'], pdf_name)
        
        # 使用PdfMerger合并所有图片生成的PDF
        merger = PdfMerger()
        
        for img_info in images:
            # 将图片转换为PDF
            img_path = img_info['path']
            temp_pdf = BytesIO()
            
            try:
                # 打开图片
                image = Image.open(img_path)
                
                # 确定PDF页面大小
                width, height = image.size
                
                # 创建一个PDF页面
                c = canvas.Canvas(temp_pdf, pagesize=(width, height))
                c.drawImage(img_path, 0, 0, width, height)
                c.save()
                
                # 将BytesIO重置到开始位置
                temp_pdf.seek(0)
                
                # 将这个页面添加到合并器
                merger.append(temp_pdf)
            except Exception as e:
                print(f"处理图片出错: {str(e)}")
                # 继续处理下一张图片
                continue
        
        # 写入合并后的PDF
        merger.write(pdf_path)
        merger.close()
        
        # 计算文件大小
        file_size = os.path.getsize(pdf_path)
        file_size_kb = round(file_size / 1024, 2)
        
        # 构建PDF下载URL
        pdf_url = f"https://excel.sube.top/download/{pdf_name}"
        
        # 清理上传的图片（仅删除通过uploads字典找到的图片）
        for img_info in images:
            if 'id' in img_info and img_info['id'] in uploads:
                try:
                    os.remove(img_info['path'])
                    del uploads[img_info['id']]
                except Exception as e:
                    print(f"清理图片失败: {str(e)}")
                    # 继续处理，不中断流程
        
        # 返回结果
        result = {
            'success': True,
            'data': {
                'pdfUrl': pdf_url,
                'fileSize': f"{file_size_kb} KB"
            }
        }
        
        response = jsonify(result)
        response.headers['Content-Type'] = 'application/json'
        return response
        
    except Exception as e:
        error_msg = f"合并PDF失败: {str(e)}"
        print(error_msg)
        response = jsonify({'success': False, 'message': error_msg})
        response.headers['Content-Type'] = 'application/json'
        return response, 500

# =============== PDF转Word功能 ===============

@app.route('/pdf-to-word', methods=['POST'])
def pdf_to_word():
    if 'pdf' not in request.files:
        return jsonify({'success': False, 'message': '未找到PDF文件'}), 400
    
    file = request.files['pdf']
    if file.filename == '':
        return jsonify({'success': False, 'message': '未选择文件'}), 400
    
    # 检查文件类型
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'success': False, 'message': '请上传PDF格式的文件'}), 400
    
    # 生成唯一文件名
    filename = secure_filename(file.filename)
    timestamp = int(time.time())
    unique_id = f"{timestamp}_{uuid.uuid4().hex[:8]}"
    pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{unique_id}_{filename}")
    file.save(pdf_path)
    
    try:
        # 生成Word文件名
        word_name = f"word_{unique_id}.docx"
        word_path = os.path.join(app.config['OUTPUT_FOLDER'], word_name)
        
        # 转换PDF为Word
        cv = Converter(pdf_path)
        cv.convert(word_path, start=0, end=None)
        cv.close()
        
        # 获取文件大小
        file_size = os.path.getsize(word_path)
        file_size_kb = round(file_size / 1024, 2)
        
        # 生成下载URL
        word_url = f"https://excel.sube.top/download/{word_name}"
        
        # 返回结果
        return jsonify({
            'success': True,
            'data': {
                'wordUrl': word_url,
                'fileSize': f"{file_size_kb}KB",
                'fileName': word_name
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'转换失败: {str(e)}'}), 500
    finally:
        # 清理上传的PDF文件
        try:
            os.remove(pdf_path)
        except:
            pass

# =============== 文件下载功能 ===============

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        # 检查文件是否存在
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        if not os.path.exists(file_path):
            response = jsonify({
                'success': False,
                'message': '文件不存在'
            })
            response.headers['Content-Type'] = 'application/json'
            return response, 404
        
        # 根据文件类型设置Content-Type
        mime_types = {
            '.pdf': 'application/pdf',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.zip': 'application/zip',
            '.7z': 'application/x-7z-compressed',
            '.html': 'text/html',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif'
        }
        
        # 获取文件扩展名
        file_ext = os.path.splitext(filename)[1].lower()
        content_type = mime_types.get(file_ext, 'application/octet-stream')
        
        # 发送文件并设置正确的Content-Type
        response = send_from_directory(
            app.config['OUTPUT_FOLDER'], 
            filename, 
            as_attachment=True
        )
        response.headers['Content-Type'] = content_type
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        error_msg = f"下载文件失败: {str(e)}"
        print(error_msg)
        response = jsonify({
            'success': False,
            'message': error_msg
        })
        response.headers['Content-Type'] = 'application/json'
        return response, 500

# =============== 文本比较功能 ===============

@app.route('/compare-text', methods=['POST'])
def compare_text():
    try:
        # 获取请求中的文本
        data = request.json
        if not data or 'text1' not in data or 'text2' not in data:
            response = jsonify({'success': False, 'message': '请提供两段要比较的文本'})
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        text1 = data['text1']
        text2 = data['text2']
        
        # 使用difflib的SequenceMatcher进行字符级别的比较
        matcher = difflib.SequenceMatcher(None, text1, text2)
        
        # 生成HTML格式的差异结果
        html_diff = []
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                html_diff.append(f'<span class="unchanged">{text1[i1:i2]}</span>')
            elif tag == 'delete':
                html_diff.append(f'<span class="removed">{text1[i1:i2]}</span>')
            elif tag == 'insert':
                html_diff.append(f'<span class="added">{text2[j1:j2]}</span>')
            elif tag == 'replace':
                html_diff.append(f'<span class="removed">{text1[i1:i2]}</span>')
                html_diff.append(f'<span class="added">{text2[j1:j2]}</span>')
        
        # 计算统计数据
        similarity = round(matcher.ratio() * 100, 2)
        added_chars = sum(j2 - j1 for tag, i1, i2, j1, j2 in matcher.get_opcodes() if tag in ('insert', 'replace'))
        removed_chars = sum(i2 - i1 for tag, i1, i2, j1, j2 in matcher.get_opcodes() if tag in ('delete', 'replace'))
        unchanged_chars = sum(i2 - i1 for tag, i1, i2, j1, j2 in matcher.get_opcodes() if tag == 'equal')
        total_chars = len(text1) + len(text2)
        
        # 创建完整的HTML
        full_html = f'''
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>文本比较结果</title>
            <style>
                * {{
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }}
                
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f8f9fa;
                }}
                
                .container {{
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e0e0e0;
                }}
                
                .header h1 {{
                    font-size: 24px;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 10px;
                }}
                
                .header p {{
                    color: #666;
                    font-size: 16px;
                }}
                
                .summary-card {{
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    margin-bottom: 30px;
                    overflow: hidden;
                }}
                
                .summary-header {{
                    background-color: #f0f0f0;
                    padding: 15px 20px;
                    border-bottom: 1px solid #e0e0e0;
                }}
                
                .summary-header h2 {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                    margin: 0;
                }}
                
                .summary-content {{
                    padding: 20px;
                }}
                
                .stats-grid {{
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }}
                
                .similarity-card {{
                    grid-column: span 2;
                    background: linear-gradient(135deg, #5b86e5, #36d1dc);
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    color: white;
                }}
                
                .similarity-value {{
                    font-size: 36px;
                    font-weight: bold;
                    margin: 10px 0;
                }}
                
                .stat-card {{
                    background-color: #f9f9f9;
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                    border: 1px solid #eee;
                }}
                
                .stat-card.added {{
                    border-left: 4px solid #4CAF50;
                }}
                
                .stat-card.removed {{
                    border-left: 4px solid #F44336;
                }}
                
                .stat-card.unchanged {{
                    border-left: 4px solid #2196F3;
                }}
                
                .stat-card h3 {{
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 10px;
                    font-weight: 500;
                }}
                
                .stat-value {{
                    font-size: 24px;
                    font-weight: bold;
                }}
                
                .stat-value.added {{
                    color: #4CAF50;
                }}
                
                .stat-value.removed {{
                    color: #F44336;
                }}
                
                .stat-value.unchanged {{
                    color: #2196F3;
                }}
                
                .legend {{
                    display: flex;
                    justify-content: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 15px;
                }}
                
                .legend-item {{
                    display: flex;
                    align-items: center;
                    margin-right: 20px;
                }}
                
                .legend-color {{
                    width: 15px;
                    height: 15px;
                    border-radius: 3px;
                    margin-right: 5px;
                }}
                
                .legend-color.added {{
                    background-color: #e6ffe6;
                    border: 1px solid #4CAF50;
                }}
                
                .legend-color.removed {{
                    background-color: #ffe6e6;
                    border: 1px solid #F44336;
                }}
                
                .legend-color.unchanged {{
                    background-color: #f0f8ff;
                    border: 1px solid #2196F3;
                }}
                
                .diff-card {{
                    background-color: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    margin-bottom: 30px;
                    overflow: hidden;
                }}
                
                .diff-header {{
                    background-color: #f0f0f0;
                    padding: 15px 20px;
                    border-bottom: 1px solid #e0e0e0;
                }}
                
                .diff-header h2 {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                    margin: 0;
                }}
                
                .diff-content {{
                    padding: 25px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: 'Source Code Pro', monospace;
                    font-size: 16px;
                    line-height: 1.8;
                    background-color: #fafafa;
                    border-radius: 0 0 10px 10px;
                    overflow-x: auto;
                }}
                
                .added {{ 
                    background-color: #e6ffe6; 
                    color: #006600; 
                    padding: 2px 4px;
                    border-radius: 3px;
                    border: 1px solid #b3ffb3;
                    margin: 0 1px;
                }}
                
                .removed {{ 
                    background-color: #ffe6e6; 
                    color: #cc0000; 
                    padding: 2px 4px;
                    text-decoration: line-through;
                    border-radius: 3px;
                    border: 1px solid #ffb3b3;
                    margin: 0 1px;
                }}
                
                .unchanged {{ 
                    color: #333;
                }}
                
                .footer {{
                    text-align: center;
                    margin-top: 40px;
                    color: #888;
                    font-size: 14px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                }}
                
                @media (max-width: 768px) {{
                    .container {{
                        padding: 15px;
                    }}
                    
                    .stats-grid {{
                        grid-template-columns: 1fr;
                    }}
                    
                    .similarity-card {{
                        grid-column: span 1;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>文本比较结果</h1>
                    <p>详细展示两段文本之间的差异</p>
                </div>
                
                <div class="summary-card">
                    <div class="summary-header">
                        <h2>比较摘要</h2>
                    </div>
                    <div class="summary-content">
                        <div class="stats-grid">
                            <div class="similarity-card">
                                <h3>文本相似度</h3>
                                <div class="similarity-value">{similarity}%</div>
                            </div>
                            
                            <div class="stat-card added">
                                <h3>新增字符</h3>
                                <div class="stat-value added">{added_chars}</div>
                            </div>
                            
                            <div class="stat-card removed">
                                <h3>删除字符</h3>
                                <div class="stat-value removed">{removed_chars}</div>
                            </div>
                            
                            <div class="stat-card unchanged">
                                <h3>相同字符</h3>
                                <div class="stat-value unchanged">{unchanged_chars}</div>
                            </div>
                            
                            <div class="stat-card">
                                <h3>文本 1 长度</h3>
                                <div class="stat-value">{len(text1)}</div>
                            </div>
                            
                            <div class="stat-card">
                                <h3>文本 2 长度</h3>
                                <div class="stat-value">{len(text2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-color added"></div>
                        <span>新增文本</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color removed"></div>
                        <span>删除文本</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color unchanged"></div>
                        <span>相同文本</span>
                    </div>
                </div>
                
                <div class="diff-card">
                    <div class="diff-header">
                        <h2>详细对比</h2>
                    </div>
                    <div class="diff-content">
                        {''.join(html_diff)}
                    </div>
                </div>
                
                <div class="footer">
                    <p>由微信小程序「文本比较工具」生成</p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        # 生成唯一的HTML文件名
        timestamp = int(time.time())
        unique_id = f"{timestamp}_{uuid.uuid4().hex[:8]}"
        html_name = f"diff_{unique_id}.html"
        html_path = os.path.join(app.config['OUTPUT_FOLDER'], html_name)
        
        # 保存HTML文件
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(full_html)
        
        # 生成下载URL
        html_url = f"https://excel.sube.top/download/{html_name}"
        
        # 返回结果
        result = {
            'success': True,
            'data': {
                'similarity': similarity,
                'added_chars': added_chars,
                'removed_chars': removed_chars,
                'unchanged_chars': unchanged_chars,
                'total_chars': total_chars,
                'resultUrl': html_url
            }
        }
        
        response = jsonify(result)
        response.headers['Content-Type'] = 'application/json'
        return response
        
    except Exception as e:
        error_msg = f"比较失败: {str(e)}"
        print(error_msg)
        response = jsonify({'success': False, 'message': error_msg})
        response.headers['Content-Type'] = 'application/json'
        return response, 500

# =============== 文件压缩功能 ===============

@app.route('/upload-file', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': '未找到文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': '未选择文件'}), 400
        
        # 获取文件索引和原始文件名
        index = int(request.form.get('index', 0))
        original_filename = request.form.get('fileName', file.filename)
        
        # 生成唯一ID
        file_id = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
        
        # 安全处理文件名
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}_{filename}")
        
        # 保存文件
        file.save(file_path)
        
        # 存储文件信息
        compression_files[file_id] = {
            'path': file_path,
            'originalName': original_filename,
            'index': index
        }
        
        return jsonify({
            'success': True,
            'data': {
                'fileId': file_id,
                'fileName': original_filename,
                'size': os.path.getsize(file_path)
            }
        })
    
    except Exception as e:
        print(f"上传文件错误: {str(e)}")
        return jsonify({'success': False, 'message': '服务器错误'}), 500

@app.route('/compress', methods=['POST'])
def compress_files():
    try:
        data = request.json
        format_type = data.get('format', 'zip')
        
        if not compression_files:
            return jsonify({'success': False, 'message': '未找到有效文件'}), 400
        
        # 创建临时目录存放文件
        temp_dir = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{int(time.time())}")
        os.makedirs(temp_dir, exist_ok=True)
        
        # 复制文件到临时目录，保持原来的文件名
        file_list = []
        for file_id, file_info in compression_files.items():
            src_path = file_info['path']
            dst_name = file_info['originalName']
            dst_path = os.path.join(temp_dir, dst_name)
            
            # 如果有重名，则添加序号
            if os.path.exists(dst_path):
                name_parts = os.path.splitext(dst_name)
                dst_name = f"{name_parts[0]}_{file_id[-4:]}{name_parts[1]}"
                dst_path = os.path.join(temp_dir, dst_name)
            
            shutil.copy2(src_path, dst_path)
            file_list.append({'name': dst_name, 'path': dst_path})
        
        # 生成压缩文件名
        timestamp = int(time.time())
        archive_name = f"files_{timestamp}"
        
        if format_type == 'zip':
            # 创建ZIP文件
            archive_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{archive_name}.zip")
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_item in file_list:
                    zipf.write(file_item['path'], arcname=file_item['name'])
            
            file_extension = 'zip'
        else:
            # 创建7Z文件
            archive_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{archive_name}.7z")
            with py7zr.SevenZipFile(archive_path, 'w') as szf:
                for file_item in file_list:
                    szf.write(file_item['path'], arcname=file_item['name'])
            
            file_extension = '7z'
        
        # 清理临时目录
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        # 清理上传的文件
        for file_id, file_info in compression_files.items():
            try:
                os.remove(file_info['path'])
            except:
                pass
        
        # 清空文件列表
        compression_files.clear()
        
        # 计算文件大小
        file_size = os.path.getsize(archive_path)
        file_size_kb = round(file_size / 1024, 2)
        
        if file_size_kb < 1024:
            file_size_str = f"{file_size_kb} KB"
        else:
            file_size_str = f"{round(file_size_kb / 1024, 2)} MB"
        
        # 构建下载URL
        file_url = f"https://excel.sube.top/download/{archive_name}.{file_extension}"
        
        return jsonify({
            'success': True,
            'data': {
                'fileSize': file_size_str,
                'fileName': f"{archive_name}.{file_extension}",
                'fileUrl': file_url
            }
        })
    
    except Exception as e:
        print(f"压缩文件错误: {str(e)}")
        return jsonify({'success': False, 'message': f'压缩失败: {str(e)}'}), 500

# =============== 根据URL合并PDF功能 ===============

@app.route('/urls-to-pdf', methods=['POST'])
def urls_to_pdf():
    try:
        # 获取请求数据
        data = request.json
        image_urls = data.get('imageUrls', [])
        
        if not image_urls or not isinstance(image_urls, list) or len(image_urls) == 0:
            response = jsonify({'success': False, 'message': '图片URL无效'})
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        # 准备图片路径列表
        image_paths = []
        for url in image_urls:
            # 从URL中提取文件名
            filename = url.split('/')[-1]
            if not filename:
                continue
                
            # 构建本地路径
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # 检查文件是否存在
            if os.path.exists(file_path):
                image_paths.append({'path': file_path, 'filename': filename})
        
        if not image_paths:
            response = jsonify({'success': False, 'message': '未找到有效图片文件'})
            response.headers['Content-Type'] = 'application/json'
            return response, 400
        
        # 生成PDF
        pdf_name = f"pdf-{int(time.time())}.pdf"
        pdf_path = os.path.join(app.config['OUTPUT_FOLDER'], pdf_name)
        
        # 使用PdfMerger合并所有图片生成的PDF
        merger = PdfMerger()
        
        for img_info in image_paths:
            # 将图片转换为PDF
            img_path = img_info['path']
            temp_pdf = BytesIO()
            
            try:
                # 打开图片
                image = Image.open(img_path)
                
                # 确定PDF页面大小
                width, height = image.size
                
                # 创建一个PDF页面
                c = canvas.Canvas(temp_pdf, pagesize=(width, height))
                c.drawImage(img_path, 0, 0, width, height)
                c.save()
                
                # 将BytesIO重置到开始位置
                temp_pdf.seek(0)
                
                # 将这个页面添加到合并器
                merger.append(temp_pdf)
            except Exception as e:
                print(f"处理图片出错: {str(e)}")
                # 继续处理下一张图片
                continue
        
        # 写入合并后的PDF
        merger.write(pdf_path)
        merger.close()
        
        # 计算文件大小
        file_size = os.path.getsize(pdf_path)
        file_size_kb = round(file_size / 1024, 2)
        
        # 构建PDF下载URL
        pdf_url = f"https://excel.sube.top/download/{pdf_name}"
        
        # 返回结果
        result = {
            'success': True,
            'data': {
                'pdfUrl': pdf_url,
                'fileSize': f"{file_size_kb} KB"
            }
        }
        
        response = jsonify(result)
        response.headers['Content-Type'] = 'application/json'
        return response
        
    except Exception as e:
        error_msg = f"根据URL合并PDF失败: {str(e)}"
        print(error_msg)
        response = jsonify({'success': False, 'message': error_msg})
        response.headers['Content-Type'] = 'application/json'
        return response, 500

# =============== PDF拆分合并功能 ===============

@app.route('/api/pdf/upload', methods=['POST'])
def pdf_upload():
    try:
        # 检查是否收到文件
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': '未接收到文件'
            }), 400
        
        file = request.files['file']
        
        # 检查文件是否为PDF
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False,
                'message': '只支持PDF文件'
            }), 400
        
        # 生成唯一文件ID
        file_id = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
        
        # 保存文件到临时目录
        temp_path = os.path.join(app.config['TEMP_FOLDER'], f"{file_id}.pdf")
        file.save(temp_path)
        
        # 处理上传后的操作
        operation = request.form.get('operation', '')
        index = request.form.get('index', '0')
        
        return jsonify({
            'success': True,
            'fileId': file_id,
            'operation': operation,
            'index': index
        })
        
    except Exception as e:
        error_msg = f"PDF上传失败: {str(e)}"
        print(error_msg)
        return jsonify({
            'success': False,
            'message': error_msg
        }), 500

@app.route('/api/pdf/analyze', methods=['POST'])
def pdf_analyze():
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "message": "未上传文件"
            }), 400
            
        file = request.files['file']
        
        # 检查文件类型
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                "success": False,
                "message": "请上传PDF文件"
            }), 400
            
        # 生成文件ID
        file_id = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
        
        # 保存文件
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['TEMP_FOLDER'], f"{file_id}_{filename}")
        file.save(file_path)
        
        # 分析PDF页数
        try:
            # 兼容PyPDF2不同版本
            try:
                # 新版本的PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf = PyPDF2.PdfReader(pdf_file)
                    page_count = len(pdf.pages)
            except:
                # 旧版本的PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf = PyPDF2.PdfFileReader(pdf_file)
                    page_count = pdf.getNumPages()
                    
            return jsonify({
                "success": True,
                "fileId": file_id,
                "pageCount": page_count
            }), 200
            
        except Exception as e:
            return jsonify({
                "success": False,
                "message": f"无法分析PDF: {str(e)}"
            }), 400
            
    except Exception as e:
        print(f"PDF分析错误: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"处理PDF时发生错误: {str(e)}"
        }), 500

@app.route('/api/pdf/merge', methods=['POST'])
def pdf_merge():
    try:
        # 获取请求数据
        data = request.json
        if not data or not data.get('files'):
            return jsonify({
                'success': False,
                'message': '未提供文件ID列表'
            }), 400
        
        file_ids = data.get('files', [])
        output_filename = data.get('filename', 'merged.pdf')
        
        if not file_ids:
            return jsonify({
                'success': False,
                'message': '文件列表为空'
            }), 400
            
        # 合并PDF
        merger = PyPDF2.PdfMerger()
        
        for file_id in file_ids:
            pdf_path = os.path.join(app.config['TEMP_FOLDER'], f"{file_id}.pdf")
            if os.path.exists(pdf_path):
                merger.append(pdf_path)
            else:
                return jsonify({
                    'success': False,
                    'message': f'文件不存在: {file_id}.pdf'
                }), 404
        
        # 生成输出文件名
        output_id = str(uuid.uuid4())
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{output_id}.pdf")
        
        # 写入合并后的PDF
        merger.write(output_path)
        merger.close()
        
        # 获取文件大小
        file_size = os.path.getsize(output_path)
        file_size_str = format_file_size(file_size)
        
        # 生成下载URL
        pdf_url = f"{request.host_url.rstrip('/')}/download/{output_id}.pdf"
        
        return jsonify({
            'success': True,
            'pdfUrl': pdf_url,
            'fileSize': file_size_str
        })
        
    except Exception as e:
        error_msg = f"PDF合并失败: {str(e)}"
        print(error_msg)
        return jsonify({
            'success': False,
            'message': error_msg
        }), 500

@app.route('/api/pdf/split', methods=['POST'])
def pdf_split():
    try:
        # 获取文件ID和范围
        data = request.json
        if not data or 'fileId' not in data:
            return jsonify({"error": "缺少文件ID"}), 400
            
        file_id = data['fileId']
        ranges = data.get('ranges', [])
        
        if not ranges or len(ranges) == 0:
            return jsonify({"error": "缺少拆分范围"}), 400
            
        # 查找文件
        file_path = None
        for root, dirs, files in os.walk(app.config['TEMP_FOLDER']):
            for file in files:
                if file.startswith(file_id):
                    file_path = os.path.join(root, file)
                    break
            if file_path:
                break
                
        if not file_path:
            return jsonify({"error": "文件不存在或已过期"}), 404
            
        # 创建输出目录
        output_dir = os.path.join(app.config['TEMP_FOLDER'], f"split_{int(time.time())}")
        os.makedirs(output_dir, exist_ok=True)
        
        # 打开PDF文件
        try:
            # 兼容PyPDF2不同版本
            try:
                # 新版本的PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf = PyPDF2.PdfReader(pdf_file)
                    total_pages = len(pdf.pages)
                    
                    # 处理每个范围
                    output_files = []
                    for i, page_range in enumerate(ranges):
                        start = page_range.get('start', 0)
                        end = page_range.get('end', 0)
                        
                        if start < 1 or end > total_pages or start > end:
                            return jsonify({"error": f"范围 {i+1} ({start}-{end}) 无效，PDF共有 {total_pages} 页"}), 400
                        
                        output = PyPDF2.PdfWriter()
                        
                        # 添加页面
                        for page_num in range(start-1, end):
                            output.add_page(pdf.pages[page_num])
                            
                        # 保存拆分后的PDF
                        output_filename = f"split_{i+1}_{start}-{end}.pdf"
                        output_path = os.path.join(output_dir, output_filename)
                        
                        with open(output_path, 'wb') as output_file:
                            output.write(output_file)
                            
                        output_files.append(output_path)
            except:
                # 旧版本的PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf = PyPDF2.PdfFileReader(pdf_file)
                    total_pages = pdf.getNumPages()
                    
                    # 处理每个范围
                    output_files = []
                    for i, page_range in enumerate(ranges):
                        start = page_range.get('start', 0)
                        end = page_range.get('end', 0)
                        
                        if start < 1 or end > total_pages or start > end:
                            return jsonify({"error": f"范围 {i+1} ({start}-{end}) 无效，PDF共有 {total_pages} 页"}), 400
                        
                        output = PyPDF2.PdfFileWriter()
                        
                        # 添加页面
                        for page_num in range(start-1, end):
                            output.addPage(pdf.getPage(page_num))
                            
                        # 保存拆分后的PDF
                        output_filename = f"split_{i+1}_{start}-{end}.pdf"
                        output_path = os.path.join(output_dir, output_filename)
                        
                        with open(output_path, 'wb') as output_file:
                            output.write(output_file)
                            
                        output_files.append(output_path)
            
            # 创建ZIP文件
            timestamp = int(time.time())
            zip_filename = f"split_pdf_{timestamp}.zip"
            zip_path = os.path.join(app.config['OUTPUT_FOLDER'], zip_filename)
            
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for file in output_files:
                    zipf.write(file, os.path.basename(file))
                    
            # 删除临时文件夹
            shutil.rmtree(output_dir)
            
            # 返回下载链接
            download_url = f"/download/{zip_filename}"
            return jsonify({
                "success": True,
                "zipUrl": request.host_url.rstrip('/') + download_url,
                "fileCount": len(output_files),
                "totalSize": format_file_size(os.path.getsize(zip_path))
            }), 200
        
        except Exception as e:
            return jsonify({
                "success": False,
                "message": f"处理PDF时出错: {str(e)}"
            }), 400
        
    except Exception as e:
        print(f"PDF拆分错误: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"处理PDF时发生错误: {str(e)}"
        }), 500

# 格式化文件大小的辅助函数
def format_file_size(size_bytes):
    """将字节数转换为可读的文件大小字符串"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes/1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes/(1024*1024):.2f} MB"
    else:
        return f"{size_bytes/(1024*1024*1024):.2f} GB"

# 原before_first_request函数改为普通函数
def ensure_temp_folder_exists():
    # 确保临时文件夹存在
    if not os.path.exists(app.config['TEMP_FOLDER']):
        os.makedirs(app.config['TEMP_FOLDER'])
    if not os.path.exists(app.config['OUTPUT_FOLDER']):
        os.makedirs(app.config['OUTPUT_FOLDER'])
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

# 在应用启动前直接调用
ensure_temp_folder_exists()

# =============== 启动服务 ===============

if __name__ == '__main__':
    # 确保所有必要的文件夹都存在
    with app.app_context():
        ensure_temp_folder_exists()
    app.run(host='0.0.0.0', port=5000, debug=False) 