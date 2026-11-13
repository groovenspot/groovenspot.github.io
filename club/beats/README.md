# 가상 클럽 비트 맵

가상 클럽(`club/`)은 소리를 유튜브로 틀어서 웹페이지가 소리를 직접 읽을 수 없어요.
그래서 영상의 **원본 녹음**을 미리 분석해 두고, 클럽은 유튜브 재생 시간만 보고 조명·드롭 점프 게임을 맞춰요.

- `rec/*.json` — 녹음마다 비트·마디·에너지·빌드업·드롭 위치 (`tools/beatmap.py analyze` 로 만듦)
- `index.json` — 분석해 둔 녹음 목록
- `videos.json` — 유튜브 영상 ID → 비트 맵 + 시간 차이. **여기 들어 있는 영상만 정확한 비트로 움직이고**, 나머지는 곡 템포로 움직여요.

## 녹음으로 새 GROOVE SESSIONS 영상을 만들었을 때

영상 최종본(또는 그 소리 파일)과 원본 녹음이 있으면 시간 차이를 자동으로 찾아 연결해요.

```bash
python3 tools/beatmap.py link club/beats/rec/20261103-taro.json \
  --youtube 새영상ID --video 최종본.mp4 --recording 타로.mp3
```

영상이 녹음보다 몇 초 늦게 시작하는지 이미 알면 (`영상 시간 = 녹음 시간 + offset`):

```bash
python3 tools/beatmap.py link club/beats/rec/20261103-taro.json --youtube 새영상ID --offset 12.5
```

새 녹음을 분석할 때:

```bash
python3 tools/beatmap.py analyze 녹음.mp3 --id 20261120-taro --name 타로 --date 2026-11-20
```

필요한 것: python3, numpy, ffmpeg
