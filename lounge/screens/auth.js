(function (L) {
  const policyLocales = ['ko', 'en', 'ja', 'zh'];
  // 대표 확정 문구입니다. 바꿀 때 전문의 정적 문구와 서버 원문도 갱신합니다.
  // 키와 교체 범위는 서버 저장소 lounge/docs/policy-decisions.md 참고.
  const announcementDates = Object.freeze({
    ko: "2026년 11월 20일",
    en: "20 November 2026",
    ja: "2026年11月20日",
    zh: "2026年11月20日"
  });
  const decisions = Object.freeze({
    effectiveDate: {
      ko: "2026년 11월 27일",
      en: "27 November 2026",
      ja: "2026年11月27日",
      zh: "2026年11月27日"
    },
    contentPermission: {
      ko: "게시물 이용 허락은 라운지에서 게시물을 제공하는 동안 게시·표시·운영에 필요한 범위에 적용돼요. 신고 검토에 필요한 기록은 아래 보관 기준을 따릅니다. 라운지 밖 홍보에 쓰려면 건별로 별도 동의를 받습니다.",
      en: "Permission covers publishing, displaying and operating the Lounge while your content is available there. Records needed to review reports follow the retention rules below. We obtain separate consent each time we want to use your content to promote the club outside the Lounge.",
      ja: "投稿の利用許諾は、ラウンジで公開している間の掲載・表示・運営に必要な範囲に適用します。通報の確認に必要な記録は以下の保存基準に従います。ラウンジ外の宣伝に使う場合は、個別に同意を得ます。",
      zh: "内容使用许可适用于内容在 Lounge 提供期间的发布、展示及运营。举报审核所需记录按下方保存规则处理。我们每次将内容用于 Lounge 之外的宣传前，都会另行征得同意。"
    },
    merchandiseTerms: {
      ko: "신청 화면에서 주문 확정 시점, 문의처, 취소·반품 및 미수령 처리 기준을 안내합니다. 직원이 확인하면 주문이 확정되며, 변경이나 문의는 매장으로 접수할 수 있어요.",
      en: "The order screen explains when an order is confirmed, how to contact us, and the terms for cancellations, returns and uncollected orders. An order is confirmed after staff review. Contact the club to request a change or ask a question.",
      ja: "申請画面に注文の確定時点、問い合わせ先、取消し・返品・未受取時の扱いを表示します。スタッフの確認後に注文が確定します。変更や問い合わせは店舗で受け付けます。",
      zh: "申请页面会说明订单何时确认、咨询渠道，以及取消、退货和未领取的处理规则。工作人员审核后订单才确认。如需变更或咨询，请联系俱乐部。"
    },
    noticeAndAppeal: {
      ko: "일반 변경은 시행 7일 전, 이용자에게 불리하거나 중요한 변경은 30일 전에 라운지에서 공지합니다. 이용 제한에 이의를 제기하면 담당자와 답변 목표 시점을 접수할 때 알려 드립니다.",
      en: "We give notice in the Lounge 7 days before ordinary changes and 30 days before material changes or changes that disadvantage users. When we receive an appeal against a restriction, we tell you who will handle it and when we aim to reply.",
      ja: "通常の変更は施行の7日前に、お客様に不利な変更や重要な変更は30日前にラウンジでお知らせします。利用制限への異議申立てを受け付けた際には、担当者と回答の目安をお伝えします。",
      zh: "一般变更会在生效前 7 天于 Lounge 公示，重要或对用户不利的变更会提前 30 天公示。收到使用限制申诉时，我们会告知处理人员和预计回复时间。"
    },
    loginFailureCleanup: {
      ko: "10분 동안 로그인 시도를 제한하는 데 쓰는 실패 기록은 만료 후 일일 정리 작업에서 삭제합니다.",
      en: "Failed-login records used for the 10-minute restriction are deleted by the daily cleanup after they expire.",
      ja: "10分間のログイン制限に使う失敗記録は、期限が切れた後に日次の整理で削除します。",
      zh: "用于 10 分钟登录限制的失败记录会在到期后的每日清理中删除。"
    },
    consentAndLogs: {
      ko: "동의한 문서의 버전, 동의 시각, 철회 이력은 접근을 제한해 따로 보관합니다. 운영 로그는 필요한 항목만 90일간 보관합니다.",
      en: "We keep the version you agreed to, the time you agreed and any withdrawal of consent separately with restricted access. We keep only necessary operational log entries for 90 days.",
      ja: "同意した文書の版、同意時刻、同意の撤回履歴はアクセスを制限して別に保存します。運用ログは必要な項目に限り90日間保存します。",
      zh: "我们单独保存您同意的文件版本、同意时间和撤回记录，并限制访问。运营日志仅保留必要项目，保存 90 天。"
    },
    pointsAndRecaps: {
      ko: "포인트 사용 가능 기간과 별도로, 포인트 원장과 관련 감사 기록은 정산·분쟁 대응에 필요한 최소 기간만 보관합니다. 결산 카드는 이용자가 직접 저장·공유할 수 있습니다.",
      en: "The points ledger and related audit records are kept only for as long as needed for reconciliation and disputes, independently of when points expire. You can save or share your recap card yourself.",
      ja: "ポイントの利用期限とは別に、ポイント台帳と関連する監査記録は精算・紛争対応に必要な最短期間だけ保存します。振り返りカードはご自身で保存・共有できます。",
      zh: "积分台账和相关审计记录按对账及处理争议所需的最短期限保存，与积分的使用期限分开。您可以自行保存或分享回顾卡片。"
    },
    photoDeletion: {
      ko: "게시물 등에 연결되지 않은 업로드는 30일 안에 삭제합니다. 게시물 삭제와 백업 만료 일정은 별도로 안내합니다.",
      en: "We delete uploads that have not been attached to a post or other feature within 30 days. We provide separate information about post deletion and backup expiry.",
      ja: "投稿などに添付されていないアップロードは30日以内に削除します。投稿の削除とバックアップの有効期限は別途お知らせします。",
      zh: "未关联帖子或其他功能的上传内容在 30 天内删除。帖子删除和备份到期的安排会另行告知。"
    },
    staffSafetyRecords: {
      ko: "스태프 시스템의 일반 경호 요청 기록은 라운지 기록과 별도로 관리하며, 30일이 지나면 정리합니다. 후속 대응이나 분쟁에 필요한 건만 접근을 제한해 별도로 보관합니다.",
      en: "The staff system keeps routine security requests separately from Lounge records and clears them after 30 days. Cases that need follow-up or involve a dispute are kept separately with restricted access.",
      ja: "スタッフ側の通常の警備要請記録はラウンジの記録と分けて管理し、30日経過後に整理します。追加対応や紛争に必要な案件のみ、アクセスを制限して別に保存します。",
      zh: "员工系统的一般安保请求与 Lounge 记录分开管理，满 30 天后清理。需要跟进或涉及争议的记录会单独保存并限制访问。"
    },
    directMessageRetention: {
      ko: "일반 대화는 마지막 활동부터 최대 180일간 보관합니다. 차단 관계는 차단 해제 또는 계정 삭제 때까지 유지합니다. 탈퇴하면 본인과 상대방 화면에서 해당 대화와 첨부를 삭제합니다. 신고에 필요한 최소 증거는 신고 기록 기준을 따릅니다.",
      en: "Ordinary conversations are kept for up to 180 days after the last activity. Blocks remain until lifted or the account is deleted. When an account is deleted, we remove the conversations and attachments from both participants’ views. Minimum evidence needed for reports follows the reporting retention rules.",
      ja: "通常の会話は最後の利用から最長180日間保存します。ブロックは解除またはアカウントの削除まで維持します。退会時は双方の画面から該当する会話と添付を削除します。通報に必要な最小限の証拠は通報記録の基準に従います。",
      zh: "普通对话自最后一次活动起最多保存 180 天。屏蔽关系持续至解除或账号注销。账号注销时，我们从双方页面删除相关对话及附件。举报所需的最少证据按举报记录规则处理。"
    },
    reportEvidence: {
      ko: "미해결 신고에 보관 예외가 필요하면 담당자가 종료일과 삭제일을 지정합니다. 스태프 기록과 감사 기록도 필요한 식별자와 최소 증거로 제한하고, 불필요한 첨부는 삭제합니다.",
      en: "If an open report requires an exception, the person handling it sets a closure date and a deletion date. Staff and audit records are limited to necessary identifiers and minimum evidence. We delete attachments that are no longer needed.",
      ja: "未解決の通報に保存の例外が必要な場合は、担当者が終了日と削除日を指定します。スタッフ記録と監査記録は必要な識別子と最小限の証拠に絞り、不要な添付を削除します。",
      zh: "尚未结案的举报需要例外保存时，由处理人员指定结案日期和删除日期。员工与审计记录仅保留必要标识和最少证据，并删除不再需要的附件。"
    },
    birthdayAndInvite: {
      ko: "삭제 요청이나 탈퇴 시 생일 월·일과 사용하지 않은 초대 코드를 정리합니다. 혜택 지급을 확인하는 데 필요한 최소 이력은 별도로 보관합니다.",
      en: "We remove the birth month and day and unused invite codes when you request deletion or close your account. We keep only the minimum history needed to verify a benefit separately.",
      ja: "削除申請や退会時に、誕生日の月日と未使用の招待コードを整理します。特典の付与確認に必要な最小限の履歴は別に保存します。",
      zh: "收到删除请求或账号注销时，会清理生日月日和未使用的邀请码。核实福利发放所需的最少记录单独保存。"
    },
    venueAndOrderRecords: {
      ko: "전광판 예약과 굿즈 주문 기록은 완료 또는 취소 후 90일간 보관합니다. 미결 요청은 처리까지 필요한 범위에서 보관하고, 법령상 보관 대상인 거래·분쟁 기록과 스태프 사본은 따로 관리합니다.",
      en: "We keep venue display and merchandise order records for 90 days after completion or cancellation. Open requests are kept as needed until handled. Transaction or dispute records that must be kept by law and staff copies are managed separately.",
      ja: "店内スクリーン予約とグッズ注文の記録は完了または取消し後90日間保存します。未完了の申請は処理に必要な範囲で保存し、法令上保存が必要な取引・紛争記録とスタッフ側の写しは別に管理します。",
      zh: "店内屏幕预约与周边订单记录在完成或取消后保存 90 天。未处理请求仅在办理所需范围内保存；依法保留的交易、争议记录及员工系统副本单独管理。"
    },
    staffSalesRecords: {
      ko: "완료 또는 취소된 테이블 문의·조각 기록은 90일간 보관합니다. 예약·킵 및 스태프 사본은 매장의 해당 기록 기준에 따라 관리하며, 주간 보고에는 개인을 식별하는 정보를 빼고 집계만 사용합니다.",
      en: "Closed or cancelled table inquiries and group requests are kept for 90 days. Reservations, bottle keeps and staff copies follow the club’s rules for those records. Weekly reports use totals without identifying guests.",
      ja: "終了または取消しとなったテーブル問い合わせ・相席の記録は90日間保存します。予約・ボトルキープ・スタッフ側の写しは店内の該当基準に従い、週次報告では個人を特定する情報を除いた集計を使用します。",
      zh: "已办结或取消的订桌咨询及拼桌记录保存 90 天。预订、存酒及员工系统副本按俱乐部相应记录规则管理，周度报告只使用不识别客人的汇总数据。"
    },
    translationLogs: {
      ko: "라운지 서버는 번역 처리가 끝난 뒤 번역 전용 기록에 요청 원문이나 번역 결과를 저장하지 않습니다. 번역 제공자의 처리와 보관에는 제공자에게 적용되는 조건이 따릅니다.",
      en: "After translation, the Lounge server does not store the submitted text or translated result in a separate translation log. The provider’s processing and retention follow the terms applicable to that provider.",
      ja: "翻訳後、ラウンジサーバーは翻訳専用ログに原文や翻訳結果を保存しません。提供元での処理と保存は、その提供元に適用される条件に従います。",
      zh: "翻译完成后，Lounge 服务器不会在独立的翻译日志中保存请求原文或译文。服务提供方的处理和保存适用其服务条款。"
    },
    cloudflareProcessing: {
      ko: "국외 처리가 적용되는 경우 수탁 법인·연락처, 처리 지역·항목·시기·방법·보관, 재위탁과 번역 입력의 학습·로그 처리, 적용 근거 및 거부 방법과 영향을 해당 처리 전에 안내합니다.",
      en: "Where processing abroad applies, we provide information before it occurs about the processor and its contact, the region, data, timing, method, retention, subprocessors, any training or logging of translation inputs, the basis for the transfer, and how to refuse it and with what effect.",
      ja: "国外処理が適用される場合は、委託先法人と連絡先、地域・項目・時期・方法・保存、再委託、翻訳入力の学習・ログ処理、根拠、拒否の方法と影響を処理前に案内します。",
      zh: "如涉及境外处理，我们会在处理前告知受托法人和联系方式、地区、项目、时间、方式、保存、再委托、翻译输入的训练和日志处理、传输依据以及拒绝方式和影响。"
    },
    pushProviders: {
      ko: "기기에서 선택할 수 있는 푸시 제공자와 연락처·국가·보관 및 국외 처리 정보는 알림을 켤 때 안내합니다. 알림 메뉴 또는 기기 설정에서 수신을 해제할 수 있습니다.",
      en: "When you turn on push, we provide information about the provider for your device, its contact, country, retention and processing abroad. You can turn it off in Alerts or in your device settings.",
      ja: "プッシュ通知を有効にする際、端末の提供元、連絡先、国、保存と国外処理について案内します。通知画面または端末設定で受信を解除できます。",
      zh: "开启推送时，我们会说明设备所用的提供方、联系方式、国家、保存及境外处理信息。您可以在通知页面或设备设置中关闭接收。"
    },
    staffProcessors: {
      ko: "스태프 시스템의 사본·백업·열람과 외부 전달은 담당자가 권한을 관리합니다. 외부 위탁, 법령에 따른 제공 및 재제공은 승인된 범위의 필요한 정보로 제한하고 그 처리를 기록합니다.",
      en: "Authorized staff manage access to staff-system copies and backups and any external sharing. Outsourcing, disclosures required by law and onward sharing are limited to necessary data within the authorized scope and are recorded.",
      ja: "スタッフ側の写し・バックアップ・閲覧・外部提供は担当者が権限を管理します。外部委託、法令に基づく提供、再提供は承認範囲の必要な情報に限定し、処理を記録します。",
      zh: "获授权的工作人员管理员工系统副本和备份、查阅及对外提供权限。对外委托、依法披露及再提供只涉及获准范围内的必要数据，并记录处理情况。"
    },
    externalContent: {
      ko: "외부 콘텐츠·폰트 제공자와 실제 사용하는 접속 로그·분석 항목을 안내합니다. 선택 동의가 필요한 경우 이를 따로 받고, 제공되는 설정에서 선택을 변경할 수 있습니다.",
      en: "We disclose external content and font providers and the access logs and analytics we actually use. Where optional consent is required, we request it separately and let you change your choice in the available settings.",
      ja: "外部コンテンツ・フォント提供元と、実際に利用するアクセスログ・分析項目を案内します。任意同意が必要な場合は別に求め、用意された設定で変更できます。",
      zh: "我们会说明外部内容和字体提供方以及实际使用的访问日志和分析项目。需要自愿同意时，我们会另行征求，您可在相关设置中更改选择。"
    },
    privacyContact: {
      ko: "개인정보 보호책임자는 그루브 클럽 대표입니다. 문의 전화는 0507-1301-5970입니다. 서면 요청은 부산 부산진구 중앙대로680번가길 52의 매장에서 접수합니다.",
      en: "The Groove Club representative is responsible for personal information protection. Contact the club at 0507-1301-5970. Written requests are accepted at the club, 52 Jungang-daero 680beonga-gil, Busanjin-gu, Busan.",
      ja: "個人情報保護責任者はグルーヴクラブの代表です。問い合わせは 0507-1301-5970 へ。書面による請求は釜山広域市釜山鎮区中央大路680番街キル52の店舗で受け付けます。",
      zh: "个人信息保护负责人为 Groove 俱乐部代表。咨询电话为 0507-1301-5970。书面请求由位于釜山釜山镇区中央大路680番街路52号的门店受理。"
    },
    rightsProcedure: {
      ko: "본인 또는 대리인이 요청하면 권한을 확인하는 데 필요한 최소 자료만 받습니다. 접수 시 처리 절차와 답변 예정 시점, 이용할 수 있는 공식 분쟁 구제 창구를 안내합니다.",
      en: "For requests by you or a representative, we collect only the minimum needed to verify authority. On receipt, we explain the response process, when we expect to reply, and the official channels available for dispute resolution.",
      ja: "本人または代理人の請求では権限確認に必要な最小限の資料のみ受け取ります。受付時に回答手続き、回答予定時期、利用できる公的な紛争解決窓口を案内します。",
      zh: "本人或代理人提出请求时，我们只收集核验权限所需的最少材料。受理时会告知处理程序、预计回复时间和可用的官方争议救济渠道。"
    },
    deletionCompletion: {
      ko: "탈퇴 확인 뒤 라운지 접근을 즉시 제한합니다. R2와 스태프 사본은 30일 안에 정리하며 실패한 삭제는 재시도합니다. 백업 순환 만료 일정과 주문·예약의 법정 보관 예외, 신고에 필요한 최소 자료 및 예외는 별도로 안내합니다.",
      en: "After account deletion is verified, Lounge access is restricted immediately. We clear R2 and staff copies within 30 days and retry failed deletions. We separately explain backup rotation, legal exceptions for order or reservation records, and minimum reporting evidence and its exceptions.",
      ja: "退会の確認後、ラウンジへのアクセスを直ちに制限します。R2とスタッフ側の写しは30日以内に整理し、失敗した削除は再試行します。バックアップの循環期限、注文・予約記録の法定例外、通報に必要な最小限の資料と例外は別途案内します。",
      zh: "确认注销后立即限制 Lounge 访问。R2 和员工系统副本在 30 天内清理，删除失败会重试。备份轮换到期、订单和预订记录的法定例外以及举报所需的最少证据和例外将另行说明。"
    }
  });

  function decisionText(key, lang) {
    const value = decisions[key];
    return value && policyLocales.every(locale => typeof value[locale] === 'string' && value[locale].trim())
      ? value[lang] || '' : '';
  }

  const policyReview = Object.freeze({
    decisionText,
    announcementText: lang => announcementDates[lang],
    pending: Object.keys(decisions).filter(key => !decisionText(key, 'ko')).length
  });
  window.LoungePolicy = policyReview;
  // policy.html loads this file on its own, without the Lounge application.
  if (!L) return;

  const copy = {
    join: ['그루브 멤버 가입', 'Join Groove Lounge'],
    invite: ['{name}님이 초대했어요', '{name} invited you'],
    scan: ['매장 직원에게 새 QR을 받아 찍어 주세요.', 'Ask a staff member for a new QR at the club.'],
    nick: ['닉네임', 'Nickname'],
    nickHint: [
      '다른 손님에게 보이는 이름이에요. 한글(가~힣), 영문, 숫자, 점(.), 밑줄(_)로 2~12자를 써 주세요.',
      'Other guests can see this name. Use 2–12 Hangul syllables, English letters, digits, periods (.) or underscores (_).'
    ],
    phone: ['휴대폰 번호', 'Phone number'],
    phoneHint: ['로그인에 써요. 다른 손님에게는 보이지 않아요.', 'Used to log in. Other guests cannot see it.'],
    pw: ['비밀번호', 'Password'],
    pwHint: ['8자 이상', 'At least 8 characters'],
    agree: ['동의', 'Consent'],
    all: ['전체 동의', 'Agree to all'],
    age19: ['필수 · 만 19세 이상이에요', 'Required · I am 19 or older'],
    terms: ['필수 · 이용약관과 커뮤니티 규칙', 'Required · Terms and community rules'],
    privacy: ['필수 · 개인정보 수집·이용', 'Required · Use of personal information'],
    ads: ['선택 · 파티와 혜택 안내 (광고)', 'Optional · Party and offer updates (ads)'],
    night: ['선택 · 야간 알림', 'Optional · Nighttime notifications'],
    view: ['보기', 'Read'],
    start: ['가입하고 시작하기', 'Join and get started'],
    login: ['로그인', 'Log in'],
    reset: ['비밀번호 바꾸기', 'Reset password'],
    savePw: ['새 비밀번호로 로그인', 'Log in with new password'],
    resetHelp: ['비밀번호를 잊었나요? 매장에서 직원에게 QR을 요청하세요.', 'Forgot your password? Ask a staff member for a QR at the club.'],
    staffLogin: ['직원 계정으로 로그인', 'Staff login'],
    staffId: ['이름 (직원 앱 아이디)', 'Name (staff app ID)'],
    staffHelp: ['직원 앱과 같은 이름·비밀번호로 들어와요.', 'Use the same name and password as the staff app.'],
    staffProfile: ['라운지에서 쓸 닉네임', 'Your lounge nickname'],
    staffProfileHint: ['손님에게는 실명 대신 닉네임만 보여요.', 'Guests see only your nickname, not your real name.'],
    staffStart: ['시작하기', 'Get started'],
    checkin: ['매장 체크인', 'Club check-in'],
    checked: ['체크인했어요', 'Checked in'],
    pending: ['확인 중이에요…', 'Checking…'],
    stamp: ['방문 스탬프 +1', 'Visit stamp +1'],
    points: ['+{gained}P · 내 포인트 {points}P', '+{gained}P · Your balance: {points}P'],
    badges: ['새 배지', 'New badges'],
    retry: ['다시 시도', 'Try again'],
    termsTitle: ['이용약관과 커뮤니티 규칙', 'Terms and community rules'],
    termsBody: [
      '만 19세 이상 손님이 매장에서 가입할 수 있어요. 사진 글·오픈 대화방·1:1 메시지에서는 타인의 권리와 개인정보를 지켜 주세요. 문제가 있으면 차단하거나 신고할 수 있어요. 보상과 굿즈의 이용 조건은 전문에서 확인해 주세요.',
      'Guests aged 19 or older can join at the club. Respect other people’s rights and privacy in photo posts, Open Chat and direct messages. You can block or report problems. Read the full text for the rewards and merchandise terms.',
      '満19歳以上のお客様が店内で登録できます。写真投稿、オープンチャット、個別メッセージで、他の人の権利とプライバシーを守ってください。問題があればブロックや通報ができます。特典とグッズの条件は全文をご確認ください。',
      '年满 19 周岁的客人可到店注册。发布照片、使用公开聊天室或发送私信时，请尊重他人的权利与隐私。遇到问题可以屏蔽或举报。奖励和周边商品的条件请阅读全文。'
    ],
    privacyTitle: ['개인정보 수집·이용', 'Use of personal information'],
    policyPending: ['확인이 필요한 항목이 {count}개 남아 있어요.', '{count} items are still under review.'],
    policyAnnouncement: ['공지일 · {date}', 'Notice date · {date}'],
    policyEffective: ['시행일 · {date}', 'Effective date · {date}'],
    privacyBody: [
      '가입·계정 관리에는 닉네임, 번호 확인값과 뒤 네 자리, 비밀번호 확인값을 써요. 글·대화·메시지·보상·굿즈 정보는 해당 기능을 쓸 때 처리합니다. 선택한 층은 매장 층 정보이며 GPS 위치는 수집하지 않아요. 번역을 누르면 선택한 글과 대상 언어를 Cloudflare Workers AI에 보내요. 보관기간과 탈퇴 안내는 전문을 확인해 주세요.',
      'We use your nickname, a phone verifier and its last four digits, and a password verifier to manage your account. We handle posts, chats, messages, rewards and merchandise data when you use those features. The selected floor is inside the club. These features do not collect GPS location. When you request a translation, we send the selected text and language to Cloudflare Workers AI. Read the full notice for retention and deletion details.',
      'アカウント管理にはニックネーム、電話番号の照合値と下4桁、パスワードの検証値を使います。投稿、チャット、メッセージ、特典、グッズの情報は各機能の利用時に処理します。選択するフロアは店内の階を示し、GPS位置情報は収集しません。翻訳を依頼すると、選んだ文章と対象言語を Cloudflare Workers AI に送ります。保存期間と退会の詳細は全文をご確認ください。',
      '账号管理会使用昵称、号码验证值及末四位和密码验证值。在使用帖子、聊天、私信、奖励或周边功能时，我们会处理对应信息。所选楼层指店内楼层，这些功能不收集 GPS 位置。请求翻译时，所选文字和目标语言会发送给 Cloudflare Workers AI。保存期限和注销详情请阅读全文。'
    ],
    'error.qr': ['가입·비밀번호 변경 QR이 잘못되었거나 시간이 지났어요. 매장에서 새 QR을 받아 주세요.', 'This QR is invalid or expired. Ask staff for a new QR.'],
    'error.nick': [
      '한글(가~힣), 영문, 숫자, 점(.), 밑줄(_)로 2~12자를 써 주세요. 일부 단어는 쓸 수 없어요.',
      'Use 2–12 Hangul syllables, English letters, digits, periods (.) or underscores (_). Some words are unavailable.'
    ],
    'error.nickAllowed': [
      '허용 문자({chars})로 {min}~{max}자를 써 주세요. 일부 단어는 쓸 수 없어요.',
      'Use {min}–{max} characters from the allowed set ({chars}). Some words are unavailable.'
    ],
    'error.nick_taken': ['이미 쓰는 닉네임이에요.', 'That nickname is taken.'],
    'error.phone': ['휴대폰 번호를 확인해 주세요.', 'Check your phone number.'],
    'error.phone_taken': ['이미 가입한 번호예요. 로그인해 주세요.', 'This number is registered. Please log in.'],
    'error.pw': ['비밀번호를 확인해 주세요. 새 비밀번호는 8자 이상이어야 해요.', 'Check your password. New passwords need at least 8 characters.'],
    'error.agree': ['필수 항목에 모두 동의해 주세요.', 'Check all required boxes.'],
    'error.bad': ['휴대폰 번호나 비밀번호를 확인해 주세요.', 'Check your phone number or password.'],
    'error.badLeft': ['번호나 비밀번호를 확인해 주세요. 남은 시도: {left}번', 'Check your number or password. Attempts left: {left}.'],
    'error.locked': ['로그인 시도가 너무 많아요. 10분 뒤 다시 시도해 주세요.', 'Too many attempts. Try again in 10 minutes.'],
    'error.staff_bad': ['이름이나 비밀번호를 확인해 주세요 (직원 앱과 같아요).', 'Check your staff name or password.'],
    'error.staff_denied': ['아직 승인되지 않은 직원 계정이에요.', 'This staff account is not approved yet.'],
    'error.ticket': ['시간이 지났어요. 직원 계정으로 다시 로그인해 주세요.', 'This took too long. Log in with your staff account again.'],
    'error.code': ['체크인 QR이 잘못되었거나 시간이 지났어요. 입구에서 새 QR을 찍어 주세요.', 'This check-in QR is invalid or expired. Scan a new code at the entrance.'],
    'error.dup': ['오늘은 이미 체크인했어요.', 'You’ve already checked in today.'],
    'error.auth': ['다시 로그인해 주세요.', 'Please log in again.'],
    'error.busy': ['잠시 뒤 다시 시도해 주세요.', 'Wait a moment and try again.'],
    'error.network': ['연결을 확인하고 다시 시도해 주세요.', 'Check your connection and try again.'],
    'error.suspended': ['계정 이용이 잠시 정지됐어요.', 'Your account is temporarily suspended.'],
    'error.banned': ['계정 이용이 제한됐어요.', 'Your account is restricted.'],
    'error.photo': ['사진을 올릴 수 없어요. 다른 사진으로 다시 시도해 주세요.', 'Could not upload the photo. Try another image.'],
    'error.floor': ['층을 다시 골라 주세요.', 'Choose a valid floor.'],
    'error.bio': ['소개를 60자까지 써 주세요.', 'Keep your bio to 60 characters.'],
    'error.generic': ['지금은 처리할 수 없어요. 잠시 뒤 다시 시도해 주세요.', 'Could not complete this right now. Try again later.']
  };
  L.i18n(Object.fromEntries(['ko', 'en'].map((lang, i) =>
    [lang, Object.fromEntries(Object.entries(copy).map(([key, pair]) => ['auth.' + key, pair[i]]))]
  )));
  const t = (key, vars) => L.esc(L.t('auth.' + key, vars));
  const nickCharacters = {
    hangul: ['한글(가~힣)', 'Hangul syllables', 'ハングルの音節（가〜힣）', '韩文音节（가～힣）'],
    latin_ascii: ['영문', 'English letters', '半角英字', '半角英文字母'],
    digits_ascii: ['숫자', 'digits', '半角数字', '半角数字'],
    dot: ['점(.)', 'periods (.)', 'ピリオド（.）', '点（.）'],
    underscore: ['밑줄(_)', 'underscores (_)', 'アンダースコア（_）', '下划线（_）']
  };
  const localeIndex = () => Math.max(0, policyLocales.indexOf(L.lang));

  const errorText = (result) => {
    if (result.error === 'bad' && Number.isInteger(result.left)) {
      return L.t('auth.error.badLeft', { left: result.left });
    }
    if (result.error === 'nick') {
      const { allowed, min, max } = result.nickRules || {};
      if (Number.isSafeInteger(min) && min > 0 && Number.isSafeInteger(max) && max >= min &&
          Array.isArray(allowed) && allowed.length > 0 && allowed.length <= Object.keys(nickCharacters).length &&
          allowed.every(key => typeof key === 'string' && Object.hasOwn(nickCharacters, key))) {
        const chars = [...new Set(allowed)].map(key => nickCharacters[key][localeIndex()]).join(', ');
        return L.t('auth.error.nickAllowed', { chars, min, max });
      }
    }
    const key = 'auth.error.' + result.error;
    return Object.hasOwn(copy, 'error.' + result.error) ? L.t(key) : L.t('auth.error.generic');
  };
  L.errorText = errorText;

  function input(name, type, autocomplete, hint = '') {
    const min = name === 'pw' && autocomplete === 'new-password' ? ' minlength="8"' : '';
    return '<label class="shell-field">' + t(name) + hint +
      '<input name="' + name + '" type="' + type + '" autocomplete="' + autocomplete + '" required' + min + '></label>';
  }

  function inviter(q) {
    try {
      const [kind, payload] = q.split('.');
      if (kind !== 'j1' || !payload) return '';
      const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const { n } = JSON.parse(new TextDecoder().decode(bytes));
      return typeof n === 'string' ? n : '';
    } catch (e) { return ''; }
  }

  const policyLink = ['전문 보기 (새 탭)', 'Read the full text (new tab)', '全文を読む（新しいタブ）', '阅读全文（新标签页）'];
  const consentDetails = [
    '동의하기 전에 사진 글·오픈 대화방·메시지·보상·굿즈·번역의 이용과 개인정보 안내를 확인해 주세요.',
    'Before agreeing, review how photo posts, Open Chat, messages, rewards, merchandise and translation work and how we handle your data.',
    '同意の前に、写真投稿、オープンチャット、メッセージ、特典、グッズ、翻訳の利用と個人情報の案内をご確認ください。',
    '请先阅读照片帖子、公开聊天室、私信、奖励、周边及翻译的使用规则和个人信息说明，再选择是否同意。'
  ];
  function policyDates(lang) {
    const announced = t('policyAnnouncement', { date: policyReview.announcementText(lang) });
    const effective = decisionText('effectiveDate', lang);
    const status = effective ? t('policyEffective', { date: effective }) :
      t('policyPending', { count: policyReview.pending });
    return '<p class="muted">' + announced + '<br>' + status + '</p>';
  }

  function policy(key) {
    const locale = localeIndex();
    const lang = policyLocales[locale];
    const path = '/lounge/policy.html#' + lang + '-' + key;
    return '<h2>' + t(key + 'Title') + '</h2><p>' + L.esc(copy[key + 'Body'][locale]) +
      '</p>' + policyDates(lang) + '<a class="shell-link" href="' + path + '" target="_blank" rel="noopener noreferrer">' +
      L.esc(policyLink[locale]) + '</a>';
  }

  function consent() {
    const fields = ['age19', 'terms', 'privacy', 'ads', 'night'];
    return '<fieldset class="shell-consent"><legend class="sr-only">' + t('agree') + '</legend>' +
      '<p class="muted">' + L.esc(consentDetails[localeIndex()]) + '</p>' + policyDates(policyLocales[localeIndex()]) +
      '<label class="shell-choice"><input type="checkbox" name="all">' + t('all') + '</label>' +
      fields.map(name => '<div class="shell-consent-row"><label class="shell-choice"><input type="checkbox" name="' +
        name + '">' + t(name) + '</label>' +
        (name === 'terms' || name === 'privacy'
          ? '<button type="button" class="shell-link" data-policy="' + name + '" aria-label="' + t(name + 'Title') + '">' + t('view') + '</button>'
          : '') + '</div>').join('') + '</fieldset>';
  }

  function formScreen(action, params, root) {
    const joining = action === 'join';
    const loggingIn = action === 'login';
    const title = joining ? 'join' : loggingIn ? 'login' : 'reset';
    const qr = params.q || params.r || '';
    const name = joining ? inviter(qr) : '';
    const hint = key => '<small class="muted">' + t(key) + '</small>';
    root.innerHTML = '<section class="shell-auth"><header class="shell-brand">GROOVE</header><h1>' + t(title) + '</h1>' +
      (name ? '<p class="muted">' + t('invite', { name }) + '</p>' : '') +
      (!loggingIn && !qr ? '<p role="alert">' + t('scan') + '</p></section>' :
        '<form class="shell-form">' +
        (joining ? input('nick', 'text', 'nickname', hint('nickHint')) : '') +
        input('phone', 'tel', loggingIn ? 'username' : 'tel', joining ? hint('phoneHint') : '') +
        input('pw', 'password', loggingIn ? 'current-password' : 'new-password', loggingIn ? '' : hint('pwHint')) +
        (joining ? consent() : '') +
        '<p class="shell-error" role="alert" hidden></p><button type="submit" class="btn btn-hot">' +
        t(joining ? 'start' : loggingIn ? 'login' : 'savePw') + '</button></form>' +
        (loggingIn ? '<p class="muted">' + t('resetHelp') + '</p><a class="shell-link" href="#/staff-login">' + t('staffLogin') + '</a>' : '<a class="shell-link" href="#/login">' + t('login') + '</a>') +
        '</section>');
    const form = root.querySelector('form');
    if (!form) return;
    if (joining) {
      const { all } = form.elements;
      const boxes = [...form.querySelectorAll('.shell-consent-row input')];
      all.onchange = () => boxes.forEach(box => { box.checked = all.checked; });
      for (const box of boxes) {
        box.onchange = () => {
          all.checked = boxes.every(item => item.checked);
          all.indeterminate = !all.checked && boxes.some(item => item.checked);
        };
      }
      for (const button of form.querySelectorAll('[data-policy]')) {
        button.onclick = () => {
          const panel = L.sheet(policy(button.dataset.policy) + '<button type="button" class="btn">' + tClose() + '</button>');
          panel.querySelector('button').onclick = L.closeSheet;
        };
      }
    }
    form.onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(form);
      const button = form.querySelector('[type=submit]');
      const error = form.querySelector('[role=alert]');
      const body = { phone: data.get('phone').trim(), pw: data.get('pw') };
      if (!loggingIn) { if (params.r) body.r = params.r; else body.q = qr; }   // 재설정 QR(r) 우선
      if (joining) {
        body.nick = data.get('nick').trim();
        body.lang = L.lang;
        for (const field of ['age19', 'terms', 'privacy', 'ads', 'night']) body[field] = data.has(field);
        if (!(body.age19 && body.terms && body.privacy)) {
          error.textContent = errorText({ error: 'agree' });
          error.hidden = false;
          return;
        }
      }
      error.hidden = true;
      button.disabled = true;
      const result = await L.api(action, body);
      button.disabled = false;
      if (!root.isConnected) return;
      if (!result.token || !result.me) {
        error.textContent = errorText(result);
        error.hidden = false;
        return;
      }
      L.setToken(result.token);
      L.me = result.me;
      if (result.me.lang) L.setLang(result.me.lang);
      const next = loggingIn && /^#\/(?!login(?:[/?]|$))/.test(params.next || '') ? params.next : 'me';
      L.go(next);
      if (joining) window.addEventListener('hashchange', () => L.showInstall(true), { once: true });
    };
  }

  const tClose = () => L.esc(L.t('core.close'));
  L.screen('join', { title: 'auth.join', render: (root, params) => formScreen('join', params, root) });
  L.screen('login', { title: 'auth.login', render: (root, params) => formScreen('login', params, root) });
  L.screen('reset', { title: 'auth.reset', render: (root, params) => formScreen('reset_pw', params, root) });
  for (const key of ['terms', 'privacy']) {
    L.screen(key, { title: 'auth.' + key + 'Title', render: root => { root.innerHTML = policy(key); } });
  }

  // 직원 계정으로 로그인 (2026-11-20): 직원 앱 이름·비밀번호 → 처음이면 닉네임·동의
  function wireConsent(form) {
    const { all } = form.elements;
    const boxes = [...form.querySelectorAll('.shell-consent-row input')];
    all.onchange = () => boxes.forEach(box => { box.checked = all.checked; });
    for (const box of boxes) box.onchange = () => { all.checked = boxes.every(item => item.checked); all.indeterminate = !all.checked && boxes.some(item => item.checked); };
    for (const button of form.querySelectorAll('[data-policy]')) {
      button.onclick = () => { const panel = L.sheet(policy(button.dataset.policy) + '<button type="button" class="btn">' + tClose() + '</button>'); panel.querySelector('button').onclick = L.closeSheet; };
    }
  }
  function signedIn(result, params) {
    L.setToken(result.token);
    L.me = result.me;
    if (result.me.lang) L.setLang(result.me.lang);
    L.go(/^#\/(?!login|staff-login)/.test(params.next || '') ? params.next : 'me');
  }
  function staffScreen(root, params) {
    root.innerHTML = '<section class="shell-auth"><header class="shell-brand">GROOVE</header><h1>' + t('staffLogin') + '</h1>' +
      '<p class="muted">' + t('staffHelp') + '</p><form class="shell-form">' +
      '<label class="shell-field">' + t('staffId') + '<input name="id" type="text" autocomplete="username" required maxlength="20"></label>' +
      input('pw', 'password', 'current-password') +
      '<p class="shell-error" role="alert" hidden></p><button type="submit" class="btn btn-hot">' + t('login') + '</button></form>' +
      '<a class="shell-link" href="#/login">' + t('login') + '</a></section>';
    const form = root.querySelector('form');
    const error = form.querySelector('[role=alert]');
    form.onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(form), button = form.querySelector('[type=submit]');
      error.hidden = true; button.disabled = true;
      const result = await L.api('staff_login', { id: data.get('id').trim(), pw: data.get('pw') });
      button.disabled = false;
      if (!root.isConnected) return;
      if (result.token && result.me) return signedIn(result, params);
      if (result.need === 'profile' && result.ticket) return profileStep(root, params, result.ticket);
      error.textContent = errorText(result); error.hidden = false;
    };
  }
  function profileStep(root, params, ticket) {
    root.innerHTML = '<section class="shell-auth"><header class="shell-brand">GROOVE</header><h1>' + t('staffProfile') + '</h1>' +
      '<p class="muted">' + t('staffProfileHint') + '</p><form class="shell-form">' +
      input('nick', 'text', 'nickname', '<small class="muted">' + t('nickHint') + '</small>') + consent() +
      '<p class="shell-error" role="alert" hidden></p><button type="submit" class="btn btn-hot">' + t('staffStart') + '</button></form></section>';
    const form = root.querySelector('form');
    const error = form.querySelector('[role=alert]');
    wireConsent(form);
    form.onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(form), button = form.querySelector('[type=submit]');
      const body = { ticket, nick: data.get('nick').trim(), lang: L.lang };
      for (const field of ['age19', 'terms', 'privacy', 'ads', 'night']) body[field] = data.has(field);
      if (!(body.age19 && body.terms && body.privacy)) { error.textContent = errorText({ error: 'agree' }); error.hidden = false; return; }
      error.hidden = true; button.disabled = true;
      const result = await L.api('staff_join', body);
      button.disabled = false;
      if (!root.isConnected) return;
      if (result.token && result.me) return signedIn(result, params);
      if (result.error === 'ticket') return staffScreen(root, params);
      error.textContent = errorText(result); error.hidden = false;
    };
  }
  L.screen('staff-login', { title: 'auth.staffLogin', render: (root, params) => staffScreen(root, params) });

  L.screen('checkin', {
    title: 'auth.checkin',
    async render(root, { c }) {
      root.innerHTML = '<h1>' + t('checkin') + '</h1><p role="status">' + t('pending') + '</p>';
      if (!c) {
        root.querySelector('[role=status]').textContent = errorText({ error: 'code' });
        return;
      }
      if (!L.me) {
        root.innerHTML = '<h1>' + t('checkin') + '</h1><button class="btn btn-hot">' + t('login') + '</button>';
        root.querySelector('button').onclick = L.needLogin;
        L.needLogin();
        return;
      }
      const result = await L.api('checkin', { c });
      if (!root.isConnected) return;
      if (result.error) {
        root.querySelector('[role=status]').textContent = errorText(result);
        if (result.error === 'auth') L.needLogin();
        if (['network', 'busy', 'auth'].includes(result.error)) {
          const retry = document.createElement('button');
          retry.className = 'btn';
          retry.textContent = L.t('auth.retry');
          retry.onclick = L.route;
          root.append(retry);
        }
        return;
      }
      const badges = Array.isArray(result.badges) ? result.badges : [];
      root.innerHTML = '<section class="shell-card"><h1>' + t('checked') + '</h1><p class="shell-score">' + t('stamp') +
        '</p><p>' + t('points', { gained: result.gained ?? 0, points: result.points ?? 0 }) + '</p>' +
        (badges.length ? '<h2>' + t('badges') + '</h2><ul>' +
          badges.map(badge => '<li>' + L.esc(badge.label || badge.key || badge) + '</li>').join('') + '</ul>' : '') +
        '<a href="#/me" class="btn btn-hot">' + L.esc(L.t('nav.me')) + '</a></section>';
      await L.refreshMe();
    }
  });
})(window.Lounge);
