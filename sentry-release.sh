#!/bin/bash
set -e  # dừng script nếu có lỗi

# ----------------------------
# Cấu hình biến môi trường
# ----------------------------
export SENTRY_AUTH_TOKEN="7533710b5cb337d74bec13e3935d76e6095cdfb02efd7c48e57871ef0ebe1417"
export SENTRY_ORG="i-am-truong"
export SENTRY_PROJECT="node-nestjs"

# ----------------------------
# Lấy phiên bản release
# ----------------------------
VERSION=$(sentry-cli releases propose-version)
echo "Using release version: $VERSION"

# ----------------------------
# Tạo release mới
# ----------------------------
echo "Creating new release..."
sentry-cli releases new "$VERSION"

# ----------------------------
# Gắn commits tự động
# ----------------------------
echo "Associating commits..."
sentry-cli releases set-commits "$VERSION" --auto

# ----------------------------
# Finalize release
# ----------------------------
echo "Finalizing release..."
sentry-cli releases finalize "$VERSION"

echo "Release $VERSION created and finalized successfully."
