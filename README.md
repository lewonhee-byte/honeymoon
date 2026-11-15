# 신혼여행 아카이브

원본 `1115.html`의 디자인·도시 이동·사진 확대·사진 편집·숙소·기록·일정·비용·Two Voices·감상문·페이지 및 자유 요소 편집을 보존한 GitHub Pages용 정적 사이트입니다. 원본 CSS와 88개 함수가 유지되었습니다. 현재 기본 상태는 읽기 전용입니다.

## 파일과 실행

`index.html`, `css/`, `js/`, `data/travel.json`, `images/`가 사이트입니다. `worker/`는 Cloudflare 인증 및 GitHub 쓰기 중계 코드이며 Pages에 배포되지 않습니다. 원본 사진 13개는 재압축 없이 분리했습니다. SVG 배경과 외부 참고 이미지 주소는 그대로 유지합니다.

Node.js 24 이상에서 저장소 루트 기준:

```powershell
node tests/verify.mjs
node scripts/build.mjs
npx --yes http-server dist -p 8080 -c-1
```

브라우저에서 표시되는 HTTP 주소를 여세요. 파일 더블클릭(file://)은 데이터 로딩과 백업 자산 읽기에 적합하지 않습니다. 별도 npm 의존성이나 빌드는 필요하지 않으며 `scripts/build.mjs`는 배포 대상만 dist에 복사합니다.

## 최초 설정 (한 번만)

1. GitHub에서 `honeymoon` 공개 저장소를 만들고 이 폴더 **내용 전체**를 main 브랜치에 올립니다. `.github/workflows/deploy.yml`도 포함해야 합니다. 원본 HTML 백업은 업로드하지 않아도 됩니다. 공개 Pages에는 여행 사진과 글이 누구에게나 보입니다.
2. 저장소 Settings → Pages → Source를 **GitHub Actions**로 선택합니다.
3. Cloudflare 계정에서 Workers를 사용할 수 있게 한 뒤, `worker/wrangler.toml`의 SITE_URL(끝 `/` 포함), REPO, BRANCH, ADMIN_LOGINS를 실제 값으로 변경합니다. 관리자 로그인 이름은 쉼표로 여러 명 지정할 수 있습니다. SITE_URL에는 GitHub Pages 저장소 경로까지 넣으세요.
4. GitHub Settings → Developer settings → OAuth Apps → New OAuth App을 만듭니다. 홈페이지는 Pages URL, callback은 `https://실제-worker주소/auth/callback`입니다. Client ID만 `GITHUB_CLIENT_ID`에 넣습니다. OAuth는 사용자 식별용 `read:user`만 요청합니다. 저장소 쓰기는 아래 서버 전용 토큰이 담당합니다.
5. GitHub fine-grained Personal Access Token을 생성합니다. 대상은 이 저장소 하나, 권한은 **Contents: Read and write**, **Actions: Read-only**, Metadata 읽기입니다. Workflow 파일을 수정하는 권한은 웹 편집기에 필요하지 않습니다. 만료일을 설정하고 만료 시 교체하세요.
6. 다음 명령을 worker 폴더에서 실행합니다. 비밀 값은 명령에 직접 적지 말고 각 명령이 요청할 때 입력합니다. SESSION_SECRET에는 비밀번호 관리자가 생성한 무작위 32바이트 이상 값을 사용합니다.

```powershell
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put REPO_TOKEN
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

7. `config.js`를 아래처럼 수정한 뒤 GitHub에 올립니다. api 끝에는 `/`를 붙이지 않습니다. GitHub OAuth callback이 실제 Worker 주소와 일치하는지 확인하세요.

```javascript
window.ARCHIVE_CONFIG={
  api:"https://honeymoon-archive-api.YOUR_SUBDOMAIN.workers.dev",
  history:"https://github.com/YOUR_NAME/honeymoon/commits/main/data/travel.json"
};
```

8. GitHub Actions의 Deploy archive가 성공하면 Pages 주소를 열고 관리자 로그인 → GitHub 인증 → 편집 → 변경사항 저장을 실행합니다. 처음 로그인하거나 저장할 때 Worker에서 GitHub 권한 오류가 나면 토큰의 대상 저장소와 권한을 확인하세요. Pages 설정과 main 브랜치 이름도 확인하세요.

## 저장과 동기화

사진과 JSON은 Git blob/tree/commit으로 준비한 뒤 하나의 브랜치 참조를 갱신합니다. 업로드가 실패하면 운영 브랜치와 JSON은 변경되지 않습니다. 준비 도중 만들어진 미참조 blob은 사이트에 노출되지 않습니다. 브랜치 갱신은 force:false이고, 읽은 head와 현재 head가 다르면 409 충돌로 중단합니다. 자동 덮어쓰기나 자동 병합은 하지 않습니다.

Commit 성공 → Actions 배포 대기 → 실제 배포 성공을 별도로 표시합니다. 약 4분 후 확인이 끝나지 않으면 Commit 성공과 확인 시간 초과를 알립니다. 배포 대기 중 수정한 내용은 다음 저장 대상으로 보존됩니다. 저장 버튼 중복 요청을 막고, 저장되지 않은 변경에 이탈 경고를 표시합니다. 모바일에서는 이탈 경고가 생략될 수 있으므로 상태 표시와 JSON 백업을 확인하세요.

다른 기기는 새로 접속/새로고침하면 배포된 최신 JSON을 캐시 없이 읽습니다. 관리자는 로그인 시 GitHub 브랜치의 최신 JSON을 직접 읽습니다. 이미 열려 있는 페이지는 자동으로 원격 내용을 덮어쓰지 않습니다. 다른 기기에서 저장한 경우 충돌이 날 수 있으므로 JSON 백업 후 새로고침하고 필요한 수정을 다시 적용하세요. 충돌 시 강제 저장 버튼은 제공하지 않습니다.

기기 내 임시 기록은 로그인 후 복구 여부를 묻습니다. 이 임시 기록과 이전 버전 localStorage 키는 자동으로 지우지 않습니다. localStorage는 용량 제한이 있으므로 저장 실패 표시가 있으면 반드시 사진 포함 JSON 백업을 내려받으세요.

## 기존 데이터 가져오기와 복원

원본 HTML은 별도 백업 파일로 보존되었습니다. 원본 페이지에서 브라우저에만 저장한 수정은 새 주소에서 직접 읽을 수 없습니다(브라우저 출처 격리). **원본 페이지에서 JSON 백업 → 새 사이트 관리자 로그인 → 기존 JSON 불러오기**를 사용하세요. 같은 출처에 남은 v6–v9 기록은 관리자 바의 이전 기록 가져오기에서 선택할 수 있습니다. 현재 기록을 JSON 백업한 뒤 확인을 거쳐 가져옵니다.

JSON 백업은 연결된 로컬 사진을 Base64로 포함합니다. HTML 내보내기는 CSS·JS·로컬 사진을 포함한 단일 파일을 만듭니다. 외부 참고 이미지에는 인터넷 연결이 필요합니다. 백업 불러오기는 덮어쓰기 확인 후 편집 상태만 바꾸며, GitHub 반영에는 변경사항 저장이 필요합니다. JSON 가져오기 전에는 현재 JSON 백업을 별도로 내려받으세요.

Commit 이력에서 이전 `data/travel.json`을 내려받아 가져오거나, GitHub에서 이전 변경을 되돌리는 새 Commit을 만들 수 있습니다. 저장소 사진 파일을 자동 삭제하지 않으므로 이전 버전의 사진 참조도 유지합니다. 저장소 용량 정리는 모든 JSON 버전 및 다른 콘텐츠 참조를 확인한 뒤 수동으로 진행하세요.

## 사진과 제한

업로드 형식은 JPEG/PNG/WebP/GIF, 원본 한 장 최대 12MiB입니다. 기존 사진 처리기를 유지하되 새 사진은 최대 가로 2400px, JPEG 품질 0.9로 처리합니다. 원본의 특정 편집 화면이 지정한 크기/크롭은 보존됩니다. GIF 애니메이션과 PNG 투명도는 기존 JPEG 변환 처리에 따라 유지되지 않습니다. 원본 사진을 별도로 보관하세요.

서버는 파일 내용 서명을 확인하고 사진 한 장 8MB, 한 번에 신규 사진 40개/총 18MB, JSON 24MB를 제한합니다. 많은 사진은 나눠 저장하세요. 사진은 SHA-256 파일명으로 중복·이름 충돌을 줄입니다. 삭제는 콘텐츠 참조 제거만 수행하여 다른 콘텐츠의 사진을 지우지 않습니다. 공개 GitHub 저장소와 Workers의 무료 제공량을 초과하면 서비스 제한이 생길 수 있으므로 대량 사진 저장소로는 사용하지 마세요.

## 인증 보안

GitHub OAuth secret과 저장소 토큰은 Workers Secrets에만 저장합니다. 브라우저에는 GitHub 토큰을 전달하지 않습니다. OAuth state는 HttpOnly/Secure/SameSite=Lax 쿠키로 확인합니다. 로그인 성공 시 서버가 AES-GCM으로 보호한 1시간짜리 관리자 세션만 반환합니다. 세션은 URL fragment를 거쳐 즉시 주소에서 제거되고 sessionStorage에 보관되며 탭을 닫으면 사라집니다. 리디렉션 방식이므로 모바일에서도 팝업이나 제3자 쿠키에 의존하지 않습니다. 로그아웃은 이 탭의 세션을 제거합니다. 서버에서 기존 세션을 모두 즉시 폐기하려면 SESSION_SECRET을 교체하세요.

Worker는 관리자 allowlist와 정확한 허용 Origin을 확인합니다. API 대상 저장소·브랜치는 서버 설정에 고정되어 있습니다. 브라우저의 읽기 전용 UI만 보안 수단으로 사용하지 않습니다. 민감한 키를 config.js/JSON/README/GitHub에 넣지 마세요. 공개 토큰 유출 시 즉시 폐기 후 교체하세요.

## 검증 현황

`VERIFICATION.md`를 확인하세요. 외부 계정 설정이 완료되지 않아 실제 OAuth·Commit·Pages 배포 성공을 검증한 상태는 아닙니다.

설계 근거: [GitHub Git references](https://docs.github.com/en/rest/git/refs), [Git trees](https://docs.github.com/en/rest/git/trees), [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
