import { getCookie } from '@/lib/ultis';

export const API_HOST = process.env.NEXT_PUBLIC_API_HOST;

function getAuthHeaders(): Record<string, string> {
    const userId = getCookie('userId');
    const role = getCookie('role');
    const headers: Record<string, string> = {};
    if (userId) {
        headers['X-User-Id'] = userId;
    }
    if (role) {
        headers['X-User-Role'] = role;
    }
    return headers;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
    } as Record<string, string>;

    // Try to get token from localStorage if not provided
    if (!headers['Authorization']) {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        } catch {
            console.warn('localStorage not available');
        }
    }

    const response = await fetch(`${API_HOST}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Optional: Redirect to login or clear token
        }
        let errorMessage = `HTTP ${response.status}`;

        try {
            const contentType = response.headers.get('content-type');
            const errorText = await response.text();

            // Thử parse JSON nếu có thể
            if (contentType && contentType.includes('application/json') || errorText.trim().startsWith('{')) {
                try {
                    const errorData = JSON.parse(errorText);
                    // Backend trả về { message: "..." } hoặc có thể có các format khác
                    errorMessage = errorData.message || errorData.error || errorText;
                } catch {
                    // Nếu parse JSON thất bại, dùng errorText
                    errorMessage = errorText || `HTTP ${response.status}`;
                }
            } else {
                // Nếu không phải JSON, dùng errorText hoặc status code
                errorMessage = errorText || `HTTP ${response.status}`;
            }
        } catch {
            // Nếu có lỗi khi đọc response, dùng status code
            errorMessage = `HTTP ${response.status}`;
        }

        throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }

    return response.text() as unknown as T;
}

export const api = {
    get: <T>(url: string, options?: RequestInit) => request<T>(url, { ...options, method: 'GET' }),
    post: <T>(url: string, body: unknown, options?: RequestInit) => request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: <T>(url: string, body: unknown, options?: RequestInit) => request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(url: string, body: unknown, options?: RequestInit) => request<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(url: string, options?: RequestInit) => request<T>(url, { ...options, method: 'DELETE' }),
};
