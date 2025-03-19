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

app = Flask(__name__)
CORS(app)

# 配置文件上传
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# 确保目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# 存储上传的图片信息
uploads = {}

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
def upload_image():
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': '未找到图片'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'message': '未选择文件'}), 400
        
        if file and allowed_file(file.filename):
            # 生成唯一ID和安全文件名
            image_id = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
            filename = secure_filename(file.filename)
            index = int(request.form.get('index', 0))
            
            # 保存文件路径
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{image_id}_{filename}")
            file.save(file_path)
            
            # 存储图片信息
            uploads[image_id] = {
                'path': file_path,
                'index': index
            }
            
            return jsonify({
                'success': True,
                'data': {
                    'imageId': image_id,
                    'fileName': filename,
                    'size': os.path.getsize(file_path)
                }
            })
        
        return jsonify({'success': False, 'message': '不支持的文件类型'}), 400
    
    except Exception as e:
        print(f"上传图片错误: {str(e)}")
        return jsonify({'success': False, 'message': '服务器错误'}), 500

@app.route('/merge-pdf', methods=['POST'])
def merge_pdf():
    try:
        data = request.json
        image_ids = data.get('imageIds', [])
        
        if not image_ids or not isinstance(image_ids, list) or len(image_ids) == 0:
            return jsonify({'success': False, 'message': '图片ID无效'}), 400
        
        # 按索引排序图片
        images = []
        for img_id in image_ids:
            if img_id in uploads:
                images.append({'id': img_id, **uploads[img_id]})
        
        if not images:
            return jsonify({'success': False, 'message': '未找到有效图片'}), 400
        
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
        
        # 写入合并后的PDF
        merger.write(pdf_path)
        merger.close()
        
        # 计算文件大小
        file_size = os.path.getsize(pdf_path)
        file_size_kb = round(file_size / 1024, 2)
        
        # 构建PDF下载URL
        pdf_url = f"https://excel.sube.top/download/{pdf_name}"
        
        # 清理上传的图片
        for img_info in images:
            try:
                os.remove(img_info['path'])
                del uploads[img_info['id']]
            except Exception as e:
                print(f"清理图片失败: {str(e)}")
        
        return jsonify({
            'success': True,
            'data': {
                'pdfUrl': pdf_url,
                'fileSize': f"{file_size_kb}KB"
            }
        })
    
    except Exception as e:
        print(f"生成PDF错误: {str(e)}")
        return jsonify({'success': False, 'message': f'服务器错误: {str(e)}'}), 500

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

# =============== 通用下载功能 ===============

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

# =============== 文本比较功能 ===============

@app.route('/compare-text', methods=['POST'])
def compare_text():
    try:
        # 获取请求中的文本
        data = request.json
        if not data or 'text1' not in data or 'text2' not in data:
            return jsonify({'success': False, 'message': '请提供两段要比较的文本'}), 400
        
        text1 = data['text1']
        text2 = data['text2']
        
        # 使用difflib比较文本
        d = difflib.Differ()
        diff = list(d.compare(text1.splitlines(), text2.splitlines()))
        
        # 生成HTML格式的差异结果
        html_diff = []
        for line in diff:
            if line.startswith('+ '):
                html_diff.append(f'<div class="added">{line[2:]}</div>')
            elif line.startswith('- '):
                html_diff.append(f'<div class="removed">{line[2:]}</div>')
            elif line.startswith('? '):
                continue  # 忽略标记行
            else:
                html_diff.append(f'<div class="unchanged">{line[2:]}</div>')
        
        # 创建完整的HTML
        full_html = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>文本比较结果</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .added {{ background-color: #e6ffe6; color: #006600; padding: 2px 0; }}
                .removed {{ background-color: #ffe6e6; color: #cc0000; padding: 2px 0; }}
                .unchanged {{ padding: 2px 0; }}
                .summary {{ margin-bottom: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="summary">
                <h3>比较摘要</h3>
                <p>文本1: {len(text1)} 字符, {len(text1.splitlines())} 行</p>
                <p>文本2: {len(text2)} 字符, {len(text2.splitlines())} 行</p>
            </div>
            <div class="diff-result">
                {''.join(html_diff)}
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
        
        # 计算相似度
        matcher = difflib.SequenceMatcher(None, text1, text2)
        similarity = round(matcher.ratio() * 100, 2)
        
        # 计算改动统计
        added_lines = sum(1 for line in diff if line.startswith('+ '))
        removed_lines = sum(1 for line in diff if line.startswith('- '))
        unchanged_lines = sum(1 for line in diff if line.startswith('  '))
        
        # 生成下载URL
        html_url = f"https://excel.sube.top/download/{html_name}"
        
        # 返回结果
        return jsonify({
            'success': True,
            'data': {
                'similarity': similarity,
                'added_lines': added_lines,
                'removed_lines': removed_lines,
                'unchanged_lines': unchanged_lines,
                'total_lines': added_lines + removed_lines + unchanged_lines,
                'resultUrl': html_url
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'比较失败: {str(e)}'}), 500

# =============== 启动服务 ===============

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False) 