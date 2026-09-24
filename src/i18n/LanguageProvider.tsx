'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type Lang = 'vi' | 'en';

export const LANGS: Array<{
    code: Lang;
    label: string;
    shortLabel: string;
    flag: string;
    locale: string; // BCP-47 for Intl
}> = [
    { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VI', flag: '🇻🇳', locale: 'vi-VN' },
    { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧', locale: 'en-US' },
];

const STORAGE_KEY = 'smth-for-love.lang';
const COOKIE_KEY = 'lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Set a cookie accessible on both client and server.
 */
function writeLangCookie(value: Lang) {
    if (typeof document === 'undefined') return;
    const secure =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
            ? '; Secure'
            : '';
    document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function readInitialLang(): Lang {
    if (typeof window === 'undefined') return 'vi';
    try {
        const fromStorage = window.localStorage.getItem(STORAGE_KEY);
        if (fromStorage === 'vi' || fromStorage === 'en') return fromStorage;
    } catch {
        // ignore
    }
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|; )lang=(vi|en)(?:;|$)/);
        if (match && (match[1] === 'vi' || match[1] === 'en')) return match[1];
    }
    return 'vi';
}

type Dict = Record<string, string>;

/**
 * Single source of truth for all user-facing strings.
 *
 * Keep keys grouped by feature/page. When a string is parameterized
 * (names, counts), use `{placeholder}` placeholders and pass via
 * `t(key, { placeholder: value })`.
 */
const VI: Dict = {
    // Brand
    'brand.name': 'Love',

    // TopNav
    'nav.dashboard': 'Tổng quan',
    'nav.memories': 'Kỷ niệm',
    'nav.anniversary': 'Kỷ niệm ngày',
    'nav.places': 'Địa điểm',
    'nav.gifts': 'Quà tặng',

    // AccountMenu
    'account.loveCode': 'Mã ghép đôi',
    'account.loveCodeCopied': 'Đã sao chép mã {code}',
    'account.changeAvatar': 'Đổi ảnh đại diện',
    'account.uploading': 'Đang tải lên…',
    'account.changePassword': 'Đổi mật khẩu',
    'account.avatarHistory': 'Lịch sử ảnh đại diện',
    'account.noPastAvatars': 'Chưa có ảnh cũ',
    'account.setAsCurrent': 'Đặt làm hiện tại',
    'account.deleteAvatar': 'Xóa',
    'account.deleteAvatarConfirm': 'Xóa ảnh đại diện này khỏi lịch sử?',
    'account.signOut': 'Đăng xuất',
    'account.signedOut': 'Đã đăng xuất',
    'account.avatarUpdated': 'Đã cập nhật ảnh đại diện',
    'account.avatarRemoved': 'Đã xóa ảnh đại diện',
    'account.copyFailed': 'Không thể sao chép',
    'account.uploadFailed': 'Tải lên thất bại',

    // Language switcher
    'lang.label': 'Ngôn ngữ',
    'lang.vi': 'Tiếng Việt',
    'lang.en': 'English',

    // Common
    'common.viewAll': 'Xem tất cả',
    'common.cancel': 'Hủy',
    'common.save': 'Lưu',
    'common.delete': 'Xóa',
    'common.edit': 'Sửa',
    'common.close': 'Đóng',
    'common.back': 'Quay lại',
    'common.confirm': 'Xác nhận',
    'common.loading': 'Đang tải…',
    'common.failed': 'Thất bại',
    'common.failedTo': 'Không thể {action}',
    'common.openPhotoViewer': 'Mở trình xem ảnh',
    'common.removeImage': 'Xóa ảnh',
    'common.you': 'Bạn',
    'common.unknown': 'Chưa rõ',
    'common.friendFallback': 'Bạn thân',

    // Dashboard
    'dashboard.welcomeBack': 'Chào mừng trở lại',
    'dashboard.welcomeBannerDesc': 'Chào mừng bạn quay lại câu chuyện tình yêu',
    'dashboard.memoriesCta': 'Kỷ niệm',
    'dashboard.statsMemories': 'Kỷ niệm',
    'dashboard.statsGifts': 'Quà tặng',
    'dashboard.statsPlaces': 'Địa điểm',
    'dashboard.statsDays': 'Ngày bên nhau',
    'dashboard.statsAlt': 'Số liệu tổng quan',

    // Partner hero
    'partner.title': 'Người thương',
    'partner.unknown': 'Chưa rõ',
    'partner.copyLoveCode': 'Sao chép mã ghép đôi',
    'partner.noPartnerTitle': 'Chưa ghép đôi',
    'partner.noPartnerDesc': 'Chạm để kết nối với một nửa của bạn',
    'partner.findPartner': 'Tìm người thương',

    // Lightbox
    'lightbox.close': 'Đóng (Esc)',
    'lightbox.prev': 'Ảnh trước',
    'lightbox.next': 'Ảnh tiếp theo',
    'lightbox.zoomIn': 'Phóng to',
    'lightbox.zoomOut': 'Thu nhỏ',
    'lightbox.download': 'Tải ảnh',
    'lightbox.downloadBlocked': 'Tải trực tiếp bị chặn — đã mở trong tab mới.',

    // Anniversary page
    'anniversary.title': 'Kỷ niệm ngày của chúng ta',
    'anniversary.subtitle': 'Chào {name} — những ngày đã làm nên chúng ta.',
    'anniversary.editBtn': 'Sửa kỷ niệm',
    'anniversary.deleteBtn': 'Xóa kỷ niệm',
    'anniversary.noPhotoYet': 'Chưa có ảnh',
    'anniversary.addPhotoPrompt': 'Thêm ảnh của hai bạn',
    'anniversary.replacePhoto': 'Thay ảnh',
    'anniversary.addPhoto': 'Thêm ảnh',
    'anniversary.removePhoto': 'Bỏ ảnh',
    'anniversary.photoHelp': 'Không bắt buộc, nhưng sẽ làm trang này thêm đặc biệt.',
    'anniversary.addBtn': 'Tạo kỷ niệm',
    'anniversary.loveStarted': 'Ngày yêu nhau',
    'anniversary.weddingDate': 'Ngày cưới',
    'anniversary.notYet': 'Chưa có',
    'anniversary.yearsMonthsTogether': '{years} năm {months} tháng bên nhau',
    'anniversary.myNote': 'Lời nhắn của {name}',
    'anniversary.partnerNote': 'Lời nhắn của {name}',
    'anniversary.partnerNoteNoName': 'Lời nhắn của người thương',
    'anniversary.nextMilestone': 'Cột mốc tiếp theo',
    'anniversary.daysToGo': 'Còn {days} ngày',
    'anniversary.todayIs': 'Hôm nay là ngày này!',
    'anniversary.daysIn': 'Đã {days} ngày',
    'anniversary.upcoming': 'Sắp tới',
    'anniversary.firstMet': 'Ngày gặp nhau lần đầu',
    'anniversary.formTitleNew': 'Tạo kỷ niệm',
    'anniversary.formTitleEdit': 'Sửa kỷ niệm',
    'anniversary.fieldLoveStart': 'Ngày yêu nhau',
    'anniversary.fieldWedding': 'Ngày cưới (tùy chọn)',
    'anniversary.fieldMyNote': 'Lời nhắn của bạn',
    'anniversary.fieldPartnerNote': 'Lời nhắn của {name}',
    'anniversary.fieldNotesPlaceholder': 'Viết đôi lời cho người thương của bạn…',
    'anniversary.fieldPartnerPlaceholder': 'Viết đôi lời gửi đến {name}…',
    'anniversary.deleteConfirm': 'Xóa kỷ niệm này? Hành động này không thể hoàn tác.',
    'anniversary.saved': 'Đã lưu kỷ niệm',
    'anniversary.deleted': 'Đã xóa kỷ niệm',
    'anniversary.uploadFailed': 'Tải ảnh thất bại',
    'anniversary.titleRequired': 'Vui lòng nhập tiêu đề',
    'anniversary.loveStartRequired': 'Vui lòng chọn ngày yêu nhau',
    'anniversary.loveTitle': 'Kỷ niệm yêu nhau',
    'anniversary.weddingTitle': 'Kỷ niệm cưới',
    'anniversary.headline': '{type} Anniversary',
    'anniversary.headlineLove': 'Kỷ niệm yêu nhau',
    'anniversary.headlineWedding': 'Kỷ niệm cưới',
    'anniversary.celebrating': 'Đang kỷ niệm hôm nay',
    'anniversary.happyNth': 'Chúc mừng kỷ niệm thứ {n}! 🎉',
    'anniversary.todayLabel': '🎉 Hôm nay!',
    'anniversary.tomorrowLabel': 'Ngày mai',
    'anniversary.inDays': 'Còn {n} ngày',
    'anniversary.unitYear': 'năm',
    'anniversary.unitYears': 'năm',
    'anniversary.unitMonth': 'tháng',
    'anniversary.unitMonths': 'tháng',
    'anniversary.unitDay': 'ngày',
    'anniversary.unitDays': 'ngày',
    'anniversary.storyStartsToday': 'Câu chuyện của hai bạn bắt đầu hôm nay — chào mừng! 💕',

    // AnniversaryCard (dashboard widget)
    'ac.title': 'Kỷ niệm',
    'ac.manage': 'Quản lý →',
    'ac.emptyTitle': 'Chưa có kỷ niệm',
    'ac.emptyDesc': 'Chạm để đặt ngày bắt đầu câu chuyện',
    'ac.createCta': 'Tạo kỷ niệm',
    'ac.togetherFor': 'Bên nhau đã',
    'ac.daysUnit': 'Ngày',
    'ac.inLoveSince': 'Yêu nhau từ',
    'ac.weddingDay': 'Ngày cưới',
    'ac.noWedding': 'Chưa đặt ngày cưới',
    'ac.nextLoveAnniversary': 'Kỷ niệm yêu nhau tiếp theo',
    'ac.nextWeddingAnniversary': 'Kỷ niệm cưới tiếp theo',
    'ac.upcoming': 'Sắp tới',
    'ac.upcomingMilestones': 'Các mốc sắp tới',
    'ac.loadFailed': 'Không thể tải kỷ niệm',

    // Milestone countdown strings
    'ms.today': 'Hôm nay 🎉',
    'ms.tomorrow': 'Ngày mai',
    'ms.inDays': 'Còn {n} ngày',
    'ms.yearlyNext': 'Kỷ niệm yêu nhau tiếp theo',
    'ms.monthlyNext': 'Kỷ niệm tháng tiếp theo',
    'ms.weeklyNext': 'Kỷ niệm tuần tiếp theo',
    'ms.roundDayNext': 'Cột mốc ngày tròn',
    'ms.yearsAnniversary': 'Kỷ niệm {n} năm',
    'ms.monthsAnniversary': 'Kỷ niệm {n} tháng',
    'ms.weeksAnniversary': 'Kỷ niệm {n} tuần',
    'ms.daysAnniversary': 'Kỷ niệm {n} ngày',
    'ms.yearShort': 'N',
    'ms.monthShort': 'T',
    'ms.weekShort': 'T',
    'ms.dayShort': 'N',

    // Memories page + MemoriesSection
    'memories.title': 'Kỷ niệm',
    'memories.subtitle': 'Chào {name} — mọi khoảnh khắc chúng ta đã chia sẻ.',
    'memories.newMemory': 'Kỷ niệm mới',
    'memories.emptyTitle': 'Chưa có kỷ niệm nào',
    'memories.emptyDesc': 'Lưu lại khoảnh khắc đầu tiên của hai bạn.',
    'memories.addMemory': 'Thêm kỷ niệm',
    'memories.ourMemories': 'Kỷ niệm của chúng ta',
    'memories.editBtn': 'Sửa kỷ niệm',
    'memories.deleteConfirm': 'Xóa "{title}"? Hành động này không thể hoàn tác.',
    'memories.deleted': 'Đã xóa kỷ niệm',
    'memories.created': 'Đã tạo kỷ niệm',
    'memories.updated': 'Đã cập nhật kỷ niệm',
    'memories.failedCreate': 'Không thể tạo kỷ niệm',
    'memories.failedUpdate': 'Không thể cập nhật kỷ niệm',
    'memories.failedDelete': 'Không thể xóa kỷ niệm',
    'memories.failedLoad': 'Không thể tải kỷ niệm',
    'memories.titleRequired': 'Vui lòng nhập tiêu đề',
    'memories.uploadingProgress': 'Đang tải {current} / {total}…',
    'memories.uploadedAll': 'Đã tải lên {count} ảnh',
    'memories.uploadedAllFailed': 'Tất cả ảnh tải lên thất bại. Chưa tạo kỷ niệm.',
    'memories.uploadedPartial': 'Đã tải {uploaded}, bỏ qua {failed} ảnh lỗi',
    'memories.formTitleNew': 'Kỷ niệm mới',
    'memories.formTitleEdit': 'Sửa kỷ niệm',
    'memories.fieldTitle': 'Tiêu đề',
    'memories.fieldTitlePlaceholder': 'Lần đi cà phê đầu tiên của chúng ta',
    'memories.fieldDate': 'Ngày xảy ra',
    'memories.fieldDescription': 'Mô tả',
    'memories.fieldDescPlaceholder': 'Kể câu chuyện của khoảnh khắc này…',
    'memories.fieldImages': 'Ảnh (tùy chọn)',
    'memories.pickImages': 'Chạm để chọn ảnh (nhiều ảnh — tải lên khi lưu)',
    'memories.uploading': 'Đang tải lên…',
    'memories.failedBadge': 'Thất bại',
    'memories.noteAdded': 'Đã thêm lời nhắn',
    'memories.noteRemoved': 'Đã xóa lời nhắn',
    'memories.noteAddFailed': 'Không thể thêm lời nhắn',
    'memories.noteRemoveFailed': 'Không thể xóa lời nhắn',
    'memories.imageRemoved': 'Đã xóa ảnh',
    'memories.imageRemoveFailed': 'Không thể xóa ảnh',
    'memories.imagesAdded': 'Đã thêm {count} ảnh',
    'memories.imagesAddedPartial': 'Đã thêm {added}, bỏ qua {failed} ảnh lỗi',
    'memories.imagesAllFailed': 'Tất cả ảnh tải lên thất bại',
    'memories.saveImages': 'Lưu ảnh',
    'memories.notePlaceholder': 'Để lại lời nhắn cho kỷ niệm này…',
    'memories.sendBtn': 'Gửi',
    'memories.ownerOnlyHint': 'Bạn chỉ có thể sửa hoặc xóa các kỷ niệm do mình tạo.',
    'memories.view': 'Xem',
    'memories.images': 'Ảnh ({count})',
    'memories.notes': 'Lời nhắn ({count})',
    'memories.noImages': 'Chưa có ảnh.',
    'memories.noNotes': 'Chưa có lời nhắn.',
    'memories.viewPhotos': 'Xem ảnh',
    'memories.byAuthor': 'Bởi {name}',
    'memories.someone': 'Ai đó',

    // Cities (Places)
    'cities.title': 'Địa điểm',
    'cities.subtitle': 'Chào {name} — những nơi chúng ta đã cùng nhau đến.',
    'cities.newVisit': 'Thêm địa điểm',
    'cities.ourPlaces': 'Những nơi chúng ta đã đến',
    'cities.emptyTitle': 'Chưa có địa điểm nào',
    'cities.emptyDesc': 'Bắt đầu lưu lại những nơi bạn đã đến cùng nhau.',
    'cities.addPlace': 'Thêm địa điểm',
    'cities.favorite': 'Yêu thích',
    'cities.deletePlace': 'Xóa địa điểm này',
    'cities.formTitleNew': 'Thêm địa điểm',
    'cities.formTitleEdit': 'Sửa địa điểm',
    'cities.fieldName': 'Tên địa điểm',
    'cities.fieldCountry': 'Quốc gia',
    'cities.fieldDate': 'Ngày đến',
    'cities.fieldRating': 'Đánh giá',
    'cities.fieldHighlights': 'Điểm nổi bật',
    'cities.fieldHighlightsPlaceholder': 'Món ăn, địa điểm, kỷ niệm đáng nhớ…',
    'cities.fieldImages': 'Ảnh (tùy chọn)',
    'cities.pickImages': 'Chạm để chọn ảnh (nhiều ảnh — tải lên khi lưu)',
    'cities.favoriteToggle': 'Đánh dấu là yêu thích',
    'cities.created': 'Đã tạo địa điểm',
    'cities.updated': 'Đã cập nhật địa điểm',
    'cities.deleted': 'Đã xóa địa điểm',
    'cities.removed': 'Đã xóa ảnh',
    'cities.failedCreate': 'Không thể tạo địa điểm',
    'cities.failedUpdate': 'Không thể cập nhật địa điểm',
    'cities.failedDelete': 'Không thể xóa địa điểm',
    'cities.failedLoad': 'Không thể tải',
    'cities.failedRemove': 'Không thể xóa ảnh',
    'cities.failedUpload': 'Tải lên thất bại',
    'cities.nameRequired': 'Vui lòng nhập tên địa điểm',
    'cities.dateRequired': 'Vui lòng chọn ngày',
    'cities.deleteConfirm': 'Xóa "{name}"? Hành động này không thể hoàn tác.',
    'cities.uploadingProgress': 'Đang tải {current} / {total}…',
    'cities.uploadedAll': 'Đã tải {count} ảnh',
    'cities.uploadedAllFailed': 'Tất cả ảnh tải lên thất bại',
    'cities.uploadedPartial': 'Đã tải {uploaded}, bỏ qua {failed} ảnh lỗi',
    'cities.images': 'Ảnh',
    'cities.imagesCount': 'Ảnh ({count})',
    'cities.highlightsLabel': 'Điểm nổi bật',

    // Gifts
    'gifts.title': 'Quà tặng',
    'gifts.subtitle': 'Chào {name} — những món quà chúng ta đã dành cho nhau.',
    'gifts.newGift': 'Thêm quà',
    'gifts.ourGifts': 'Những món quà của chúng ta',
    'gifts.emptyTitle': 'Chưa có món quà nào',
    'gifts.emptyDesc': 'Lưu lại những món quà ý nghĩa giữa hai bạn.',
    'gifts.addGift': 'Thêm quà',
    'gifts.deleteGift': 'Xóa món quà này',
    'gifts.formTitleNew': 'Thêm quà mới',
    'gifts.formTitleEdit': 'Sửa quà',
    'gifts.fieldName': 'Tên món quà',
    'gifts.fieldNamePlaceholder': 'Bó hoa, chiếc nhẫn, tấm thiệp…',
    'gifts.fieldOccasion': 'Dịp',
    'gifts.fieldDate': 'Ngày nhận',
    'gifts.fieldGiver': 'Người tặng (tùy chọn)',
    'gifts.fieldGiverPlaceholder': 'Tên người tặng',
    'gifts.fieldPartner': 'Gửi cho (tùy chọn)',
    'gifts.fieldPartnerPlaceholder': 'Chọn người nhận',
    'gifts.fieldNotes': 'Lời nhắn',
    'gifts.fieldNotesPlaceholder': 'Cảm xúc của bạn về món quà này…',
    'gifts.fieldImages': 'Ảnh (tùy chọn)',
    'gifts.pickImages': 'Chạm để chọn ảnh (nhiều ảnh — tải lên khi lưu)',
    'gifts.searchPartnerPlaceholder': 'Tìm theo username hoặc love code…',
    'gifts.created': 'Đã thêm quà',
    'gifts.updated': 'Đã cập nhật quà',
    'gifts.deleted': 'Đã xóa quà',
    'gifts.removed': 'Đã xóa ảnh',
    'gifts.failedCreate': 'Không thể tạo quà',
    'gifts.failedUpdate': 'Không thể cập nhật quà',
    'gifts.failedDelete': 'Không thể xóa quà',
    'gifts.failedLoad': 'Không thể tải',
    'gifts.failedRemove': 'Không thể xóa ảnh',
    'gifts.failedUpload': 'Tải lên thất bại',
    'gifts.nameRequired': 'Vui lòng nhập tên món quà',
    'gifts.dateRequired': 'Vui lòng chọn ngày',
    'gifts.deleteConfirm': 'Xóa "{name}"? Hành động này không thể hoàn tác.',
    'gifts.uploadingProgress': 'Đang tải {current} / {total}…',
    'gifts.uploadedAll': 'Đã tải {count} ảnh',
    'gifts.uploadedAllFailed': 'Tất cả ảnh tải lên thất bại',
    'gifts.uploadedPartial': 'Đã tải {uploaded}, bỏ qua {failed} ảnh lỗi',
    'gifts.fromGiver': 'Từ {name}',
    'gifts.giverUnknown': '—',
    'gifts.occasions.birthday': 'Sinh nhật',
    'gifts.occasions.anniversary': 'Kỷ niệm ngày',
    'gifts.occasions.valentine': 'Valentine',
    'gifts.occasions.christmas': 'Giáng sinh',
    'gifts.occasions.wedding': 'Cưới',
    'gifts.occasions.justBecause': 'Chỉ là muốn tặng',
    'gifts.occasions.other': 'Khác',
    'gifts.giverUserChip': 'Người dùng #{id}',

    // Relationship section
    'relationship.yourConnection': 'Mối quan hệ',
    'relationship.findYourPartner': 'Tìm người thương',
    'relationship.findHelp': 'Nhập mã 6 ký tự của người thương để gửi yêu cầu kết nối.',
    'relationship.incomingRequests': 'Yêu cầu đến',
    'relationship.viewAll': 'Xem tất cả →',
    'relationship.moreInInbox': '+{count} yêu cầu khác →',
    'relationship.respondAccept': 'Chấp nhận',
    'relationship.respondReject': 'Từ chối',
    'relationship.accepted': 'Đã chấp nhận yêu cầu',
    'relationship.declined': 'Đã từ chối yêu cầu',
    'relationship.failedAccept': 'Không thể chấp nhận',
    'relationship.failedReject': 'Không thể từ chối',
    'relationship.requestSent': 'Đã gửi yêu cầu kết nối',
    'relationship.requestFailed': 'Không thể gửi yêu cầu',
    'relationship.codeRequired': 'Vui lòng nhập mã 6 ký tự',
    'relationship.codePlaceholder': 'Mã 6 ký tự',
    'relationship.sendRequest': 'Gửi yêu cầu',
    'relationship.sending': 'Đang gửi…',
    'relationship.partnerLabel': 'Người thương',
    'relationship.refresh': 'Tải lại',
    'relationship.youHavePartner': 'Bạn đang kết nối với {name}',
    'relationship.sentRequestTo': 'Đã gửi yêu cầu tới {name}',
    'relationship.youSent': 'Bạn đã gửi yêu cầu tới {name}. Đang chờ phản hồi.',
    'relationship.theySent': '{name} đã gửi cho bạn yêu cầu kết nối.',

    // Connection-requests page
    'cr.title': 'Yêu cầu kết nối',
    'cr.subtitle': 'Quản lý các yêu cầu kết nối của bạn.',
    'cr.emptyTitle': 'Chưa có yêu cầu nào',
    'cr.emptyDesc': 'Bạn sẽ thấy các yêu cầu đến ở đây.',

    // Change-password page
    'cp.title': 'Đổi mật khẩu',
    'cp.subtitle': 'Cập nhật mật khẩu cho tài khoản của bạn.',
    'cp.currentPwd': 'Mật khẩu hiện tại',
    'cp.newPwd': 'Mật khẩu mới',
    'cp.confirmPwd': 'Xác nhận mật khẩu mới',
    'cp.showPwd': 'Hiện mật khẩu',
    'cp.save': 'Đổi mật khẩu',
    'cp.saved': 'Đã đổi mật khẩu',
    'cp.failed': 'Không thể đổi mật khẩu',
    'cp.minLength': 'Mật khẩu phải có ít nhất 6 ký tự',
    'cp.mismatch': 'Mật khẩu xác nhận không khớp',

    // Login / Register / Forgot password
    'auth.loginTitle': 'Đăng nhập',
    'auth.loginSubtitle': 'Chào mừng trở lại — tiếp tục câu chuyện tình yêu',
    'auth.registerTitle': 'Tạo tài khoản',
    'auth.registerSubtitle': 'Bắt đầu hành trình yêu thương của bạn',
    'auth.forgotTitle': 'Quên mật khẩu',
    'auth.forgotSubtitle': 'Chúng tôi sẽ giúp bạn lấy lại mật khẩu',
    'auth.email': 'Email',
    'auth.password': 'Mật khẩu',
    'auth.confirmPassword': 'Xác nhận mật khẩu',
    'auth.displayName': 'Tên hiển thị',
    'auth.username': 'Tên đăng nhập',
    'auth.signIn': 'Đăng nhập',
    'auth.signUp': 'Đăng ký',
    'auth.signOut': 'Đăng xuất',
    'auth.continue': 'Tiếp tục',
    'auth.backToLogin': 'Quay lại đăng nhập',
    'auth.forgotPwd': 'Quên mật khẩu?',
    'auth.noAccount': 'Chưa có tài khoản?',
    'auth.haveAccount': 'Đã có tài khoản?',
    'auth.createAccount': 'Tạo tài khoản',
    'auth.welcomeBack': 'Chào mừng trở lại',
    'auth.checkEmail': 'Kiểm tra email của bạn để đặt lại mật khẩu.',
    'auth.invalidEmail': 'Email không hợp lệ',
    'auth.pwdMismatch': 'Mật khẩu không khớp',
    'auth.fillAllFields': 'Vui lòng điền tất cả các trường',
    'auth.pwdTooShort': 'Mật khẩu phải có ít nhất 6 ký tự',

    // Misc
    'misc.signInRequired': 'Vui lòng đăng nhập',
    'misc.signedOut': 'Đã đăng xuất',
};

const EN: Dict = {
    // Brand
    'brand.name': 'Love',

    // TopNav
    'nav.dashboard': 'Dashboard',
    'nav.memories': 'Memories',
    'nav.anniversary': 'Anniversary',
    'nav.places': 'Places',
    'nav.gifts': 'Gifts',

    // AccountMenu
    'account.loveCode': 'Love code',
    'account.loveCodeCopied': 'Love code {code} copied',
    'account.changeAvatar': 'Change avatar',
    'account.uploading': 'Uploading…',
    'account.changePassword': 'Change password',
    'account.avatarHistory': 'Avatar history',
    'account.noPastAvatars': 'No past avatars',
    'account.setAsCurrent': 'Set as current',
    'account.deleteAvatar': 'Delete',
    'account.deleteAvatarConfirm': 'Delete this avatar from your history?',
    'account.signOut': 'Sign out',
    'account.signedOut': 'Signed out',
    'account.avatarUpdated': 'Avatar updated',
    'account.avatarRemoved': 'Avatar removed',
    'account.copyFailed': 'Failed to copy',
    'account.uploadFailed': 'Upload failed',

    // Language switcher
    'lang.label': 'Language',
    'lang.vi': 'Tiếng Việt',
    'lang.en': 'English',

    // Common
    'common.viewAll': 'View all',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading…',
    'common.failed': 'Failed',
    'common.failedTo': 'Failed to {action}',
    'common.openPhotoViewer': 'Open photo viewer',
    'common.removeImage': 'Remove image',
    'common.you': 'You',
    'common.unknown': 'Unknown',
    'common.friendFallback': 'Friend',

    // Dashboard
    'dashboard.welcomeBack': 'Welcome back',
    'dashboard.welcomeBannerDesc': 'Welcome back to your love story',
    'dashboard.memoriesCta': 'Memories',
    'dashboard.statsMemories': 'Memories',
    'dashboard.statsGifts': 'Gifts',
    'dashboard.statsPlaces': 'Places',
    'dashboard.statsDays': 'Days together',
    'dashboard.statsAlt': 'Snapshot stats',

    // Partner hero
    'partner.title': 'Your Partner',
    'partner.unknown': 'Unknown',
    'partner.copyLoveCode': 'Copy love code',
    'partner.noPartnerTitle': 'No partner connected yet',
    'partner.noPartnerDesc': 'Tap to connect with your special someone',
    'partner.findPartner': 'Find partner',

    // Lightbox
    'lightbox.close': 'Close (Esc)',
    'lightbox.prev': 'Previous photo',
    'lightbox.next': 'Next photo',
    'lightbox.zoomIn': 'Zoom in',
    'lightbox.zoomOut': 'Zoom out',
    'lightbox.download': 'Download photo',
    'lightbox.downloadBlocked': 'Direct download blocked — opened in new tab.',

    // Anniversary page
    'anniversary.title': 'Our Anniversary',
    'anniversary.subtitle': 'Hi, {name} — the dates that made us, us.',
    'anniversary.editBtn': 'Edit anniversary',
    'anniversary.deleteBtn': 'Delete anniversary',
    'anniversary.noPhotoYet': 'No photo yet',
    'anniversary.addPhotoPrompt': 'Add a photo of the two of you',
    'anniversary.replacePhoto': 'Replace photo',
    'anniversary.addPhoto': 'Add photo',
    'anniversary.removePhoto': 'Remove photo',
    'anniversary.photoHelp': 'Optional, but it makes this page special.',
    'anniversary.addBtn': 'Add anniversary',
    'anniversary.loveStarted': 'Love started',
    'anniversary.weddingDate': 'Wedding date',
    'anniversary.notYet': 'Not yet',
    'anniversary.yearsMonthsTogether': '{years} years {months} months together',
    'anniversary.myNote': '{name}\'s note',
    'anniversary.partnerNote': "{name}'s note",
    'anniversary.partnerNoteNoName': "Partner's note",
    'anniversary.nextMilestone': 'Next milestone',
    'anniversary.daysToGo': '{days} days to go',
    'anniversary.todayIs': 'Today is the day!',
    'anniversary.daysIn': '{days} days in',
    'anniversary.upcoming': 'Upcoming',
    'anniversary.firstMet': 'First met',
    'anniversary.formTitleNew': 'New anniversary',
    'anniversary.formTitleEdit': 'Edit anniversary',
    'anniversary.fieldLoveStart': 'Love start date',
    'anniversary.fieldWedding': 'Wedding date (optional)',
    'anniversary.fieldMyNote': 'Your note',
    'anniversary.fieldPartnerNote': "{name}'s note",
    'anniversary.fieldNotesPlaceholder': 'Write a few words for your partner…',
    'anniversary.fieldPartnerPlaceholder': 'Write a few words for {name}…',
    'anniversary.deleteConfirm': 'Delete this anniversary? This cannot be undone.',
    'anniversary.saved': 'Anniversary saved',
    'anniversary.deleted': 'Anniversary deleted',
    'anniversary.uploadFailed': 'Upload failed',
    'anniversary.titleRequired': 'Title is required',
    'anniversary.loveStartRequired': 'Please pick a love start date',
    'anniversary.loveTitle': 'Love anniversary',
    'anniversary.weddingTitle': 'Wedding anniversary',
    'anniversary.headline': '{type} Anniversary',
    'anniversary.headlineLove': 'Love Anniversary',
    'anniversary.headlineWedding': 'Wedding Anniversary',
    'anniversary.celebrating': 'Celebrating today',
    'anniversary.happyNth': 'Happy {n}th anniversary! 🎉',
    'anniversary.todayLabel': '🎉 Today!',
    'anniversary.tomorrowLabel': 'Tomorrow',
    'anniversary.inDays': 'in {n} days',
    'anniversary.unitYear': 'year',
    'anniversary.unitYears': 'years',
    'anniversary.unitMonth': 'month',
    'anniversary.unitMonths': 'months',
    'anniversary.unitDay': 'day',
    'anniversary.unitDays': 'days',
    'anniversary.storyStartsToday': 'Your story starts today — welcome! 💕',

    // AnniversaryCard (dashboard widget)
    'ac.title': 'Anniversary',
    'ac.manage': 'Manage →',
    'ac.emptyTitle': 'No anniversary yet',
    'ac.emptyDesc': 'Tap to set the date your story began',
    'ac.createCta': 'Create anniversary',
    'ac.togetherFor': 'Together for',
    'ac.daysUnit': 'days',
    'ac.inLoveSince': 'In love since',
    'ac.weddingDay': 'Wedding day',
    'ac.noWedding': 'No wedding date set yet',
    'ac.nextLoveAnniversary': 'Next love anniversary',
    'ac.nextWeddingAnniversary': 'Next wedding anniversary',
    'ac.upcoming': 'Upcoming',
    'ac.upcomingMilestones': 'Upcoming milestones',
    'ac.loadFailed': 'Failed to load anniversary',

    // Milestone countdown strings
    'ms.today': 'Today 🎉',
    'ms.tomorrow': 'Tomorrow',
    'ms.inDays': 'in {n} days',
    'ms.yearlyNext': 'Next yearly anniversary',
    'ms.monthlyNext': 'Next monthly anniversary',
    'ms.weeklyNext': 'Next weekly anniversary',
    'ms.roundDayNext': 'Round-day anniversary',
    'ms.yearsAnniversary': '{n} year anniversary',
    'ms.monthsAnniversary': '{n} months anniversary',
    'ms.weeksAnniversary': '{n} weeks anniversary',
    'ms.daysAnniversary': '{n} days anniversary',
    'ms.yearShort': 'Y',
    'ms.monthShort': 'M',
    'ms.weekShort': 'W',
    'ms.dayShort': 'D',

    // Memories page + MemoriesSection
    'memories.title': 'Memories',
    'memories.subtitle': 'Hi, {name} — every moment we\'ve shared.',
    'memories.newMemory': 'New memory',
    'memories.emptyTitle': 'No memories yet',
    'memories.emptyDesc': 'Capture your first moment together.',
    'memories.addMemory': 'Add a memory',
    'memories.ourMemories': 'Our Memories',
    'memories.editBtn': 'Edit memory',
    'memories.deleteConfirm': 'Delete "{title}"? This cannot be undone.',
    'memories.deleted': 'Memory deleted',
    'memories.created': 'Memory created',
    'memories.updated': 'Memory updated',
    'memories.failedCreate': 'Failed to create memory',
    'memories.failedUpdate': 'Failed to update memory',
    'memories.failedDelete': 'Failed to delete memory',
    'memories.failedLoad': 'Failed to load memories',
    'memories.titleRequired': 'Title is required',
    'memories.uploadingProgress': 'Uploading {current} of {total}…',
    'memories.uploadedAll': 'Uploaded {count} image(s)',
    'memories.uploadedAllFailed': 'All uploads failed. Memory not created.',
    'memories.uploadedPartial': 'Uploaded {uploaded}, skipped {failed} failed',
    'memories.formTitleNew': 'New Memory',
    'memories.formTitleEdit': 'Edit Memory',
    'memories.fieldTitle': 'Title',
    'memories.fieldTitlePlaceholder': 'Our first coffee date',
    'memories.fieldDate': 'Date it happened',
    'memories.fieldDescription': 'Description',
    'memories.fieldDescPlaceholder': 'Tell the story of this moment...',
    'memories.fieldImages': 'Images (optional)',
    'memories.pickImages': 'Click to attach images (multiple allowed — upload on save)',
    'memories.uploading': 'Uploading…',
    'memories.failedBadge': 'Failed',
    'memories.noteAdded': 'Note added',
    'memories.noteRemoved': 'Note removed',
    'memories.noteAddFailed': 'Failed to add note',
    'memories.noteRemoveFailed': 'Failed to remove note',
    'memories.imageRemoved': 'Image removed',
    'memories.imageRemoveFailed': 'Failed to remove image',
    'memories.imagesAdded': 'Added {count} image(s)',
    'memories.imagesAddedPartial': 'Added {added}, skipped {failed} failed',
    'memories.imagesAllFailed': 'All uploads failed',
    'memories.saveImages': 'Save images',
    'memories.notePlaceholder': 'Leave a note for this memory...',
    'memories.sendBtn': 'Send',
    'memories.ownerOnlyHint': 'You can only edit or delete memories you created.',
    'memories.view': 'View',
    'memories.images': 'Images ({count})',
    'memories.notes': 'Notes ({count})',
    'memories.noImages': 'No images yet.',
    'memories.noNotes': 'No notes yet.',
    'memories.viewPhotos': 'View photos',
    'memories.byAuthor': 'by {name}',
    'memories.someone': 'Someone',

    // Cities (Places)
    'cities.title': 'Places',
    'cities.subtitle': 'Hi, {name} — the places we\'ve been to together.',
    'cities.newVisit': 'New place',
    'cities.ourPlaces': 'Our places',
    'cities.emptyTitle': 'No places yet',
    'cities.emptyDesc': 'Start saving the spots you visit together.',
    'cities.addPlace': 'Add a place',
    'cities.favorite': 'Favorite',
    'cities.deletePlace': 'Delete this place',
    'cities.formTitleNew': 'New place',
    'cities.formTitleEdit': 'Edit place',
    'cities.fieldName': 'Place name',
    'cities.fieldCountry': 'Country',
    'cities.fieldDate': 'Date visited',
    'cities.fieldRating': 'Rating',
    'cities.fieldHighlights': 'Highlights',
    'cities.fieldHighlightsPlaceholder': 'Food, spots, things to remember…',
    'cities.fieldImages': 'Images (optional)',
    'cities.pickImages': 'Click to attach images (multiple allowed — upload on save)',
    'cities.favoriteToggle': 'Mark as favorite',
    'cities.created': 'Place added',
    'cities.updated': 'Place updated',
    'cities.deleted': 'Place deleted',
    'cities.removed': 'Image removed',
    'cities.failedCreate': 'Failed to create place',
    'cities.failedUpdate': 'Failed to update place',
    'cities.failedDelete': 'Failed to delete place',
    'cities.failedLoad': 'Failed to load',
    'cities.failedRemove': 'Failed to remove image',
    'cities.failedUpload': 'Upload failed',
    'cities.nameRequired': 'Place name is required',
    'cities.dateRequired': 'Please pick a date',
    'cities.deleteConfirm': 'Delete "{name}"? This cannot be undone.',
    'cities.uploadingProgress': 'Uploading {current} of {total}…',
    'cities.uploadedAll': 'Uploaded {count} image(s)',
    'cities.uploadedAllFailed': 'All uploads failed',
    'cities.uploadedPartial': 'Uploaded {uploaded}, skipped {failed} failed',
    'cities.images': 'Images',
    'cities.imagesCount': 'Images ({count})',
    'cities.highlightsLabel': 'Highlights',

    // Gifts
    'gifts.title': 'Gifts',
    'gifts.subtitle': 'Hi, {name} — the gifts we\'ve given each other.',
    'gifts.newGift': 'New gift',
    'gifts.ourGifts': 'Our gifts',
    'gifts.emptyTitle': 'No gifts yet',
    'gifts.emptyDesc': 'Save the meaningful gifts between you two.',
    'gifts.addGift': 'Add a gift',
    'gifts.deleteGift': 'Delete this gift',
    'gifts.formTitleNew': 'New gift',
    'gifts.formTitleEdit': 'Edit gift',
    'gifts.fieldName': 'Gift name',
    'gifts.fieldNamePlaceholder': 'A bouquet, a ring, a card…',
    'gifts.fieldOccasion': 'Occasion',
    'gifts.fieldDate': 'Date received',
    'gifts.fieldGiver': 'Giver (optional)',
    'gifts.fieldGiverPlaceholder': 'Name of the giver',
    'gifts.fieldPartner': 'Sent to (optional)',
    'gifts.fieldPartnerPlaceholder': 'Pick a recipient',
    'gifts.fieldNotes': 'Note',
    'gifts.fieldNotesPlaceholder': 'Your feelings about this gift…',
    'gifts.fieldImages': 'Images (optional)',
    'gifts.pickImages': 'Click to attach images (multiple allowed — upload on save)',
    'gifts.searchPartnerPlaceholder': 'Search by username or love code…',
    'gifts.created': 'Gift added',
    'gifts.updated': 'Gift updated',
    'gifts.deleted': 'Gift deleted',
    'gifts.removed': 'Image removed',
    'gifts.failedCreate': 'Failed to create gift',
    'gifts.failedUpdate': 'Failed to update gift',
    'gifts.failedDelete': 'Failed to delete gift',
    'gifts.failedLoad': 'Failed to load',
    'gifts.failedRemove': 'Failed to remove image',
    'gifts.failedUpload': 'Upload failed',
    'gifts.nameRequired': 'Gift name is required',
    'gifts.dateRequired': 'Please pick a date',
    'gifts.deleteConfirm': 'Delete "{name}"? This cannot be undone.',
    'gifts.uploadingProgress': 'Uploading {current} of {total}…',
    'gifts.uploadedAll': 'Uploaded {count} image(s)',
    'gifts.uploadedAllFailed': 'All uploads failed',
    'gifts.uploadedPartial': 'Uploaded {uploaded}, skipped {failed} failed',
    'gifts.fromGiver': 'from {name}',
    'gifts.giverUnknown': '—',
    'gifts.occasions.birthday': 'Birthday',
    'gifts.occasions.anniversary': 'Anniversary',
    'gifts.occasions.valentine': 'Valentine',
    'gifts.occasions.christmas': 'Christmas',
    'gifts.occasions.wedding': 'Wedding',
    'gifts.occasions.justBecause': 'Just because',
    'gifts.occasions.other': 'Other',
    'gifts.giverUserChip': 'User #{id}',

    // Relationship section
    'relationship.yourConnection': 'Your connection',
    'relationship.findYourPartner': 'Find your partner',
    'relationship.findHelp': "Enter your partner's 6-character love code to send a connection request.",
    'relationship.incomingRequests': 'Incoming requests',
    'relationship.viewAll': 'View all →',
    'relationship.moreInInbox': '+{count} more in inbox →',
    'relationship.respondAccept': 'Accept',
    'relationship.respondReject': 'Decline',
    'relationship.accepted': 'Request accepted!',
    'relationship.declined': 'Request declined',
    'relationship.failedAccept': 'Failed to accept',
    'relationship.failedReject': 'Failed to reject',
    'relationship.requestSent': 'Request sent',
    'relationship.requestFailed': 'Failed to send request',
    'relationship.codeRequired': 'Please enter a 6-character code',
    'relationship.codePlaceholder': '6-character code',
    'relationship.sendRequest': 'Send request',
    'relationship.sending': 'Sending…',
    'relationship.partnerLabel': 'Your partner',
    'relationship.refresh': 'Refresh',
    'relationship.youHavePartner': "You're connected with {name}",
    'relationship.sentRequestTo': 'Request sent to {name}',
    'relationship.youSent': "You've sent a request to {name}. Waiting for response.",
    'relationship.theySent': '{name} sent you a connection request.',

    // Connection-requests page
    'cr.title': 'Connection requests',
    'cr.subtitle': 'Manage your connection requests.',
    'cr.emptyTitle': 'No requests yet',
    'cr.emptyDesc': 'Incoming requests will appear here.',

    // Change-password page
    'cp.title': 'Change password',
    'cp.subtitle': 'Update the password for your account.',
    'cp.currentPwd': 'Current password',
    'cp.newPwd': 'New password',
    'cp.confirmPwd': 'Confirm new password',
    'cp.showPwd': 'Show password',
    'cp.save': 'Change password',
    'cp.saved': 'Password changed',
    'cp.failed': 'Failed to change password',
    'cp.minLength': 'Password must be at least 6 characters',
    'cp.mismatch': 'Passwords do not match',

    // Login / Register / Forgot password
    'auth.loginTitle': 'Sign in',
    'auth.loginSubtitle': 'Welcome back — keep your love story going',
    'auth.registerTitle': 'Create account',
    'auth.registerSubtitle': 'Start your love journey',
    'auth.forgotTitle': 'Forgot password',
    'auth.forgotSubtitle': "We'll help you recover your password",
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.displayName': 'Display name',
    'auth.username': 'Username',
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Sign up',
    'auth.signOut': 'Sign out',
    'auth.continue': 'Continue',
    'auth.backToLogin': 'Back to sign in',
    'auth.forgotPwd': 'Forgot password?',
    'auth.noAccount': "Don't have an account?",
    'auth.haveAccount': 'Already have an account?',
    'auth.createAccount': 'Create account',
    'auth.welcomeBack': 'Welcome back',
    'auth.checkEmail': 'Check your email to reset your password.',
    'auth.invalidEmail': 'Invalid email',
    'auth.pwdMismatch': 'Passwords do not match',
    'auth.fillAllFields': 'Please fill in all fields',
    'auth.pwdTooShort': 'Password must be at least 6 characters',

    // Misc
    'misc.signInRequired': 'Please sign in',
    'misc.signedOut': 'Signed out',
};

const DICTS: Record<Lang, Dict> = { vi: VI, en: EN };

type LanguageContextValue = {
    lang: Lang;
    setLang: (next: Lang) => void;
    /** Translate a key, with optional `{placeholder}` substitution. */
    t: (key: string, params?: Record<string, string | number>) => string;
    /** Available languages for UI (e.g. switcher). */
    languages: typeof LANGS;
    /** Active BCP-47 locale code (e.g. `vi-VN`). */
    locale: string;
    /** Format a Date using the current language's locale. */
    formatDate: (
        date: Date | string | null | undefined,
        opts?: Intl.DateTimeFormatOptions,
    ) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>('vi');

    useEffect(() => {
        setLangState(readInitialLang());
    }, []);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore
        }
        writeLangCookie(next);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = next;
        }
    }, []);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>) => {
            const raw = DICTS[lang][key] ?? DICTS.vi[key] ?? key;
            if (!params) return raw;
            return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
                const v = params[name];
                return v == null ? `{${name}}` : String(v);
            });
        },
        [lang],
    );

    const locale = useMemo(
        () => LANGS.find((l) => l.code === lang)?.locale ?? 'en-US',
        [lang],
    );

    const formatDate = useCallback(
        (
            date: Date | string | null | undefined,
            opts?: Intl.DateTimeFormatOptions,
        ): string => {
            if (!date) return '';
            const d = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(d.getTime())) return '';
            const o: Intl.DateTimeFormatOptions = opts ?? {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            };
            try {
                return new Intl.DateTimeFormat(locale, o).format(d);
            } catch {
                return d.toLocaleDateString(undefined, o);
            }
        },
        [locale],
    );

    const value = useMemo<LanguageContextValue>(
        () => ({
            lang,
            setLang,
            t,
            languages: LANGS,
            locale,
            formatDate,
        }),
        [lang, setLang, t, locale, formatDate],
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        return {
            lang: 'vi',
            setLang: () => {},
            t: (key: string) => VI[key] ?? key,
            languages: LANGS,
            locale: 'vi-VN',
            formatDate: (d, opts) => {
                if (!d) return '';
                const date = typeof d === 'string' ? new Date(d) : d;
                if (isNaN(date.getTime())) return '';
                return new Intl.DateTimeFormat('vi-VN', opts).format(date);
            },
        };
    }
    return ctx;
}

export function useT() {
    return useLanguage().t;
}
