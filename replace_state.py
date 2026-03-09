import re
import os

filepath = r"C:\Users\user\Downloads\notebook_editor\js\app.js"
backup_path = r"C:\Users\user\Downloads\notebook_editor\js\app_backup.js"

# 1. 백업 생성
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

with open(backup_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Backup created.")

# 2. 할당 구문 변환: state.prop = value; -> AppState.setState({ prop: value });
# 예: state.currentPage = 2; -> AppState.setState({ currentPage: 2 });
content = re.sub(
    r'state\.([a-zA-Z0-9_]+)\s*=\s*([^;]+);',
    r"AppState.setState({ \1: \2 });",
    content
)

# 3. 단순 참조 구문 변환: state.prop -> AppState.get('prop')
content = re.sub(
    r'state\.([a-zA-Z0-9_]+)',
    r"AppState.get('\1')",
    content
)

# 4. 파일 저장
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("State replacement completed.")
