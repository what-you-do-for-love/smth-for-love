export function urlB64ToUint8Array(base64String: string): Uint8Array {
	if (!base64String) {
		throw new Error('Base64 string is required but was undefined or empty');
	}

	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, "+")
		.replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

// Cookie utilities with iOS compatibility
export function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;

	try {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) {
			const cookieValue = parts.pop()?.split(';').shift() || null;
			// Decode URI component to handle Vietnamese text
			return cookieValue ? decodeURIComponent(cookieValue) : null;
		}
		return null;
	} catch (error) {
		console.warn('Error reading cookie:', error);
		return null;
	}
}

export function setCookie(name: string, value: string, days: number = 30): void {
	if (typeof document === 'undefined') return;

	try {
		const expires = new Date();
		expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
		document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
	} catch (error) {
		console.warn('Error setting cookie:', error);
	}
}

export function deleteCookie(name: string): void {
	if (typeof document === 'undefined') return;

	try {
		document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
	} catch (error) {
		console.warn('Error deleting cookie:', error);
	}
}

export const formatNumberInput = (value: number | string | '' | null | undefined): string => {
	if (value === '' || value === null || value === undefined) return '';
	if (typeof value !== 'number' && typeof value !== 'string') return '';

	const raw = typeof value === 'number' ? value.toString() : value;
	if (raw === '') return '';

	// Bỏ dấu phẩy phân cách hàng nghìn để chuẩn hóa, rồi kiểm tra định dạng.
	const cleaned = raw.replace(/,/g, '').trim();
	if (cleaned === '' || cleaned === '.' || cleaned === '-') return cleaned === '-' ? '-' : '';

	// Chỉ chấp nhận một dấu chấm thập phân và một dấu trừ ở đầu.
	if (!/^-?\d*\.?\d*$/.test(cleaned)) return '';

	const num = Number(cleaned);
	if (Number.isNaN(num)) return '';

	const parts = cleaned.split('.');
	const integerPart = parts[0];
	const decimalPart = parts[1];
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

export const parseNumberInput = (input: string): number | '' => {
	if (!input) return '';

	// Bỏ tất cả dấu phẩy (hàng nghìn), giữ lại dấu chấm (thập phân)
	const cleaned = input.replace(/,/g, '');

	if (!cleaned || cleaned === '.') return '';

	const num = Number(cleaned);
	return Number.isNaN(num) ? '' : num;
};

/**
 * Live role helpers — read the `role` cookie on every call so logout /
 * login changes are picked up immediately instead of waiting for a
 * useEffect-driven state refresh.
 *
 * The role values come from the BE's `UserRoles` constants
 * (`Admin = "Admin"`, `User = "User"`). The check is case-insensitive.
 */

const normalizeRole = (raw: string | null | undefined): string => (raw ?? '').trim().toLowerCase();

/** Reads the `role` cookie directly (no React state). */
export function getUserRole(): string {
    return normalizeRole(getCookie('role'));
}

/** Reads the `userId` cookie directly (no React state). */
export function getUserId(): string | null {
    return getCookie('userId');
}

/** Reads the `userName` cookie directly (no React state). */
export function getUserName(): string | null {
    return getCookie('userName');
}

/** Reads the `department` cookie directly (no React state). */
export function getUserDepartment(): string {
    return getCookie('department') ?? '';
}

/** Reads the `loveCode` cookie directly (no React state). */
export function getUserLoveCode(): string {
    return getCookie('loveCode') ?? '';
}

/** True when the current cookie role is `Admin`. */
export function isAdminUser(): boolean {
    const role = getUserRole();
    return role === 'admin';
}

/** Auth cookies cleared on logout. */
export const AUTH_COOKIES = [
    'userId',
    'userName',
    'role',
    'name',
    'department',
    'isSuperAdmin',
    'loveCode',
] as const;

/** Clears every auth-related cookie + removes the token from localStorage. */
export function clearAuth(): void {
    AUTH_COOKIES.forEach((name) => deleteCookie(name));
    try {
        localStorage.removeItem('token');
    } catch {
        // ignore
    }
}

export const printHtmlContent = (html: string): void => {
	const iframe = document.createElement('iframe');
	iframe.style.position = 'fixed';
	iframe.style.right = '0';
	iframe.style.bottom = '0';
	iframe.style.width = '0';
	iframe.style.height = '0';
	iframe.style.border = '0';
	document.body.appendChild(iframe);

	const win = iframe.contentWindow;
	if (!win) return;
	win.document.open();
	win.document.write(html);
	win.document.close();

	iframe.onload = () => {
		win.focus();
		win.print();

		setTimeout(() => {
			document.body.removeChild(iframe);
		}, 1000);
	};
};
