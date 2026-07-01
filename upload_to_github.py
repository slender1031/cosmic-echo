#!/usr/bin/env python3
"""
通过 GitHub API 上传代码到仓库
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.parse
import urllib.error

TOKEN = sys.argv[1]
USERNAME = sys.argv[2]
REPO = sys.argv[3]
BRANCH = sys.argv[4] if len(sys.argv) > 4 else "main"

HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
}

def api_request(method, endpoint, data=None):
    url = f"https://api.github.com{endpoint}"
    try:
        if method == "GET":
            req = urllib.request.Request(url, headers=HEADERS)
        else:
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode("utf-8") if data else None,
                headers=HEADERS,
                method=method
            )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"  [X] API error {e.code}: {error_body[:200]}")
        return None
    except Exception as e:
        print(f"  [X] Request failed: {e}")
        return None

def get_all_files():
    """遍历目录获取所有文件（排除 .git 和 node_modules）"""
    files = []
    exclude_dirs = {".git", "node_modules", ".next", ".workbuddy", ".vercel", "dist", "build"}
    
    for root, dirs, filenames in os.walk("."):
        # 修改 dirs 列表，跳过排除的目录
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for fname in filenames:
            fpath = os.path.join(root, fname)
            # 移除开头的 ./
            fpath = os.path.relpath(fpath, ".")
            # 跳过脚本自身
            if fpath == "upload_to_github.py" or fpath == "push_to_github.py":
                continue
            files.append(fpath)
    
    return sorted(files)

def file_to_base64(fpath):
    """读取文件并转换为 base64"""
    with open(fpath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def repo_is_empty():
    """检查仓库是否为空"""
    result = api_request("GET", f"/repos/{USERNAME}/{REPO}/commits?per_page=1")
    if result is None:
        return True  # 如果获取失败，假设为空
    return len(result) == 0

def create_file(fpath, content_b64, commit_msg, branch, sha=None):
    """通过 Contents API 创建或更新文件"""
    # URL 编码文件路径
    encoded_path = urllib.parse.quote(fpath, safe='')
    endpoint = f"/repos/{USERNAME}/{REPO}/contents/{encoded_path}"
    
    data = {
        "message": commit_msg,
        "content": content_b64,
        "branch": branch,
        "committer": {"name": USERNAME, "email": "rylic@qq.com"}
    }
    
    if sha:
        data["sha"] = sha
    
    result = api_request("PUT", endpoint, data)
    return result

def get_file_sha(fpath, branch):
    """获取文件的 SHA（用于更新已存在的文件）"""
    encoded_path = urllib.parse.quote(fpath, safe='')
    endpoint = f"/repos/{USERNAME}/{REPO}/contents/{encoded_path}?ref={branch}"
    result = api_request("GET", endpoint)
    if result and "sha" in result:
        return result["sha"]
    return None

print("[*] Preparing to upload to GitHub...")
print(f"[*] Repository: {USERNAME}/{REPO}")
print("[*] Scanning files...")

files = get_all_files()
print(f"[+] Found {len(files)} files")

# 检查仓库是否为空
print("[*] Checking repository status...")
try:
    is_empty = repo_is_empty()
    print(f"    Repository is empty: {is_empty}")
except:
    is_empty = True
    print("    Could not check, assuming empty")

# 分批上传文件
batch_size = 5  # 减小批次大小，避免超时
total_files = len(files)

for i in range(0, total_files, batch_size):
    batch = files[i:i+batch_size]
    print(f"\n[*] Uploading batch {i//batch_size + 1}/{(total_files + batch_size - 1)//batch_size}")
    
    for fpath in batch:
        print(f"    - {fpath}")
        
        try:
            content_b64 = file_to_base64(fpath)
            
            # 检查文件是否已存在
            sha = None
            if not is_empty:
                sha = get_file_sha(fpath, BRANCH)
            
            commit_msg = f"Add {fpath}" if sha is None else f"Update {fpath}"
            result = create_file(fpath, content_b64, commit_msg, BRANCH, sha)
            
            if result and "content" in result:
                print(f"      [OK]")
            else:
                print(f"      [WARN] Maybe failed, but continue...")
        
        except Exception as e:
            print(f"      [ERROR] {e}")
            continue

print(f"\n[+] Upload complete!")
print(f"[+] View repository: https://github.com/{USERNAME}/{REPO}")
