#!/bin/bash
cd /home/sube/image-to-excel-api
source venv/bin/activate
gunicorn -w 4 -b 0.0.0.0:5000 app:app --timeout 120 