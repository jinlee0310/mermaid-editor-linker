# Obsidian Mermaid-to-VSCode Linker 플러그인 개발 플랜

## 목표

Obsidian에서 Mermaid 다이어그램의 컴포넌트 노드를 클릭하면 VS Code에서 해당 소스코드 파일이 열리는 플러그인 개발

## 배경

- Obsidian은 Mermaid `click` 디렉티브에서 `vscode://` 프로토콜을 차단함 (`https://`만 허용)
- 기존 다이어그램에 이미 `<i>features/self-check/main/index.tsx</i>` 형태로 파일 경로가 포함되어 있음
- 플러그인이 렌더링된 SVG에서 파일 경로를 자동 감지하여 클릭 이벤트를 부착하는 방식

## 기술 스택

- TypeScript
- Obsidian Plugin API (`registerMarkdownPostProcessor`)
- Node.js `child_process` (VS Code 열기: `code` CLI 또는 `open` 명령)
- esbuild (번들링)

## 플러그인 구조

```
obsidian-plugin/
├── manifest.json          # 플러그인 메타데이터
├── main.ts                # 플러그인 진입점
├── styles.css             # 클릭 가능 노드 스타일링
├── settings.ts            # 설정 탭 (basePath 등)
├── package.json
├── tsconfig.json
├── esbuild.config.mjs     # 번들러 설정
├── PLAN.md                # 이 문서
└── dist/
    └── main.js            # 빌드 결과물
```

## 핵심 로직

### 1단계: Mermaid SVG 후처리

```typescript
this.registerMarkdownPostProcessor((el, ctx) => {
  const mermaidEls = el.querySelectorAll('.mermaid svg');
  mermaidEls.forEach(svg => this.processNodes(svg));
});
```

### 2단계: 노드에서 파일 경로 감지

렌더링된 SVG 내부 구조:
```html
<g class="node">
  <foreignObject>
    <div class="nodeLabel">
      SelfCheckContent<br/>
      <i>features/self-check/main/index.tsx</i>   <!-- 이 경로를 감지 -->
    </div>
  </foreignObject>
</g>
```

감지 정규식:
```typescript
const FILE_PATH_REGEX = /((?:app|features|components|hooks|store|lib|utils|constants)\/[\w\-\/\.]+\.tsx?)/;
```

### 3단계: 클릭 이벤트 부착

```typescript
processNodes(svg: SVGElement) {
  const nodes = svg.querySelectorAll('.node, .nodeLabel');
  nodes.forEach(node => {
    const text = node.textContent;
    const match = text?.match(FILE_PATH_REGEX);
    if (match) {
      const relativePath = match[1];
      const fullPath = `${this.settings.basePath}/${relativePath}`;

      node.style.cursor = 'pointer';
      node.classList.add('mermaid-clickable');
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openInVSCode(fullPath);
      });
    }
  });
}
```

### 4단계: VS Code에서 파일 열기

```typescript
openInVSCode(filePath: string) {
  const { exec } = require('child_process');
  exec(`code "${filePath}"`);
}
```

## 설정 (Settings)

| 설정 항목 | 기본값 | 설명 |
|-----------|--------|------|
| basePath | `/Users/hyojin/Desktop/wowfit/wowfit-app` | 소스코드 루트 경로 |
| editor | `vscode` | 에디터 선택 (vscode / cursor / webstorm) |
| clickModifier | `none` | 클릭 조건 (none / ctrl / cmd) |

## CSS 스타일

```css
/* 클릭 가능 노드 시각적 표시 */
.mermaid-clickable {
  cursor: pointer !important;
}

.mermaid-clickable:hover .nodeLabel {
  text-decoration: underline;
  text-decoration-color: rgba(66, 135, 245, 0.7);
  text-underline-offset: 2px;
}

/* 파일 경로 텍스트 강조 */
.mermaid-clickable .nodeLabel i {
  color: #4287f5;
  font-size: 0.85em;
}
```

## 구현 단계

### Step 1: 프로젝트 초기화
- [ ] `package.json`, `tsconfig.json`, `esbuild.config.mjs` 생성
- [ ] Obsidian 타입 설치 (`obsidian`, `@types/node`)
- [ ] `manifest.json` 작성

### Step 2: 최소 동작 버전 (MVP)
- [ ] `main.ts` — `registerMarkdownPostProcessor`로 SVG 후처리
- [ ] `<i>` 태그 내 파일 경로 감지
- [ ] 클릭 시 `exec('code "파일경로"')` 실행
- [ ] `styles.css` — 클릭 가능 노드 호버 스타일
- [ ] 빌드 후 `.obsidian/plugins/`에 복사하여 테스트

### Step 3: 설정 추가
- [ ] `settings.ts` — PluginSettingTab 구현
- [ ] basePath, editor, clickModifier 설정
- [ ] data.json 저장/로드

### Step 4: 엣지 케이스 처리
- [ ] `diagram-zoom-drag` 플러그인과의 이벤트 충돌 해결
- [ ] 파일 존재 여부 확인 후 없으면 토스트 알림
- [ ] `sequenceDiagram` participant 텍스트에서도 경로 감지
- [ ] 다크/라이트 테마 대응

### Step 5: 개발 편의
- [ ] 핫 리로드 스크립트 (빌드 → 플러그인 폴더 복사 → Obsidian 리로드)
- [ ] `npm run dev` 워치 모드

## 빌드 & 배포

```bash
# 개발
npm run dev          # esbuild watch + 자동 복사

# 빌드
npm run build        # dist/main.js 생성

# 설치 (심볼릭 링크)
ln -s $(pwd)/dist /Users/hyojin/Desktop/wowfit/wowfit-architecture/wowfit/.obsidian/plugins/mermaid-vscode-linker
```

## 주의사항

- `diagram-zoom-drag` 플러그인이 SVG를 `.izd-container`로 감싸므로, 이벤트 전파(`stopPropagation`)에 주의
- Obsidian 모바일에서는 `exec` 사용 불가 → `isDesktopOnly: true` 설정
- 파일 경로가 `<i>` 태그가 아닌 `*italic*` 마크다운으로 작성된 경우도 있으므로 `<em>` 태그도 감지 필요

## 참고

- Obsidian Plugin API: https://docs.obsidian.md/Plugins
- 기존 플러그인 참고: `diagram-zoom-drag` (SVG 후처리 패턴)
- 대상 Obsidian 보관함: `/Users/hyojin/Desktop/wowfit/wowfit-architecture/wowfit/`
- 대상 소스코드: `/Users/hyojin/Desktop/wowfit/wowfit-app/`
