#!/usr/bin/env python3
"""Push local Git repo to GitHub via REST API using stdlib only.
Handles empty repos by using the Contents API for the first file,
then the Git Blobs API for the rest."""

import sys
import os
import json
import base64
import subprocess
from urllib.request import Request, urlopen
from urllib.error import HTTPError

TOKEN = sys.argv[1]
REPO_OWNER = sys.argv[2]
REPO_NAME = sys.argv[3]
BRANCH = sys.argv[4] if len(sys.argv) > 4 else "main"

BASE = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"

def api(method, path, body=None, is_json=True, use_base=True):
    url = (BASE + path) if use_base else path
    data = json.dumps(body).encode() if body else None
    req = Request(url, data=data, method=method)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Accept", "application/vnd.github.v3+json")
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read()) if is_json else resp.read().decode()
    except HTTPError as e:
        err_body = e.read().decode()
        print(f"HTTP Error {e.code}: {err_body}")
        sys.exit(1)

def get_local_files():
    # Disable quoting of non-ASCII paths
    subprocess.run(
        ["git", "config", "--global", "core.quotepath", "false"],
        capture_output=True, cwd="."
    )
    result = subprocess.run(
        ["git", "ls-files"],
        capture_output=True, text=True, cwd="."
    )
    return [f for f in result.stdout.strip().split("\n") if f]

def is_binary(file_path):
    try:
        with open(file_path, "rb") as f:
            chunk = f.read(8192)
            return b"\x00" in chunk
    except Exception:
        return True

def repo_is_empty():
    try:
        api("GET", f"/git/refs/heads/{BRANCH}")
        return False
    except SystemExit:
        try:
            repo = api("GET", "")
            default = repo.get("default_branch", "main")
            api("GET", f"/git/refs/heads/{default}")
            return False
        except SystemExit:
            return True

print(f"Pushing to {REPO_OWNER}/{REPO_NAME} branch {BRANCH}...")

files = get_local_files()
print(f"Found {len(files)} files to push")

if repo_is_empty():
    print("Repository is empty, using Contents API for initial push...")
    # Push files one by one using Contents API
    # The content field must be base64-encoded
    for i, fp in enumerate(files):
        print(f"  [{i+1}/{len(files)}] {fp}")
        with open(fp, "rb") as f:
            content_bytes = f.read()
        content_b64 = base64.b64encode(content_bytes).decode("utf-8")
        body = {
            "message": "Initial commit" if i == 0 else f"Add {fp}",
            "content": content_b64,
            "branch": BRANCH,
            "committer": {"name": "slender1031", "email": "rylic@qq.com"}
        }
        api("PUT", f"/contents/{fp}", body)
    
    print(f"\n✅ Done! View at https://github.com/{REPO_OWNER}/{REPO_NAME}/tree/{BRANCH}")
else:
    print("Repository has commits, using Git API...")
    # Get latest commit
    try:
        ref = api("GET", f"/git/refs/heads/{BRANCH}")
        parent_sha = ref["object"]["sha"]
    except SystemExit:
        repo = api("GET", "")
        default = repo.get("default_branch", "main")
        ref = api("GET", f"/git/refs/heads/{default}")
        parent_sha = ref["object"]["sha"]
    
    commit_data = api("GET", f"/git/commits/{parent_sha}")
    base_tree_sha = commit_data["tree"]["sha"]
    
    # Create blobs
    print("Creating blobs...")
    tree_items = []
    for fp in files:
        print(f"  {fp}")
        with open(fp, "rb") as f:
            content_bytes = f.read()
        encoded = base64.b64encode(content_bytes).decode("utf-8")
        resp = api("POST", "/git/blobs", {"content": encoded, "encoding": "base64"})
        tree_items.append({
            "path": fp,
            "mode": "100644",
            "type": "blob",
            "sha": resp["sha"],
        })
    
    # Create tree
    print("Creating tree...")
    tree = api("POST", "/git/trees", {"base_tree": base_tree_sha, "tree": tree_items})
    
    # Create commit
    print("Creating commit...")
    new_commit = api("POST", "/git/commits", {
        "message": "Update from local",
        "tree": tree["sha"],
        "parents": [parent_sha],
        "committer": {"name": "slender1031", "email": "rylic@qq.com"}
    })
    
    # Update reference
    print(f"Updating branch {BRANCH}...")
    try:
        api("PATCH", f"/git/refs/heads/{BRANCH}", {"sha": new_commit["sha"]})
    except SystemExit:
        api("POST", "/git/refs", {"ref": f"refs/heads/{BRANCH}", "sha": new_commit["sha"]})
    
    print(f"\n✅ Done! View at https://github.com/{REPO_OWNER}/{REPO_NAME}/tree/{BRANCH}")
