import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ADMIN_LOCALES,
  USER_LOCALES,
  DEFAULT_LOCALE,
  type Locale,
} from "@/i18n/config";

/**
 * Locale State Interface
 */
interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  getAvailableLocales: (
    user?: { role?: string; roles?: string[] } | null
  ) => Locale[];
  isLocaleAvailable: (
    locale: Locale,
    user?: { role?: string; roles?: string[] } | null
  ) => boolean;
  initializeLocale: (user?: { role?: string; roles?: string[] } | null) => void;
}

/**
 * Locale Store với Zustand
 * Quản lý ngôn ngữ dựa trên role của user
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => {
      return {
        // Initial state - mặc định là DEFAULT_LOCALE
        locale: DEFAULT_LOCALE,

        // Set locale với validation
        setLocale: (locale: Locale) => {
          // Tạm thời set locale, sẽ được validate lại khi initializeLocale được gọi
          set({ locale });
        },

        // Lấy danh sách locale khả dụng dựa trên role
        getAvailableLocales: (
          user?: { role?: string; roles?: string[] } | null
        ): Locale[] => {
          // Nếu không có user được truyền vào, mặc định trả về USER_LOCALES
          // User sẽ được truyền vào từ component/hook khi cần
          if (!user) {
            return [...USER_LOCALES];
          }

          // Kiểm tra nếu user là admin
          const isAdmin =
            user.role === "admin" ||
            (Array.isArray(user.roles) && user.roles.includes("admin"));

          if (isAdmin) {
            return [...ADMIN_LOCALES];
          }

          return [...USER_LOCALES];
        },

        // Kiểm tra locale có khả dụng không
        isLocaleAvailable: (
          locale: Locale,
          user?: { role?: string; roles?: string[] } | null
        ): boolean => {
          const availableLocales = get().getAvailableLocales(user);
          return availableLocales.includes(locale);
        },

        // Khởi tạo locale dựa trên role hiện tại
        initializeLocale: (
          user?: { role?: string; roles?: string[] } | null
        ) => {
          const currentLocale = get().locale;
          const availableLocales = get().getAvailableLocales(user);

          // Nếu locale hiện tại không khả dụng, set về locale đầu tiên trong danh sách
          if (!availableLocales.includes(currentLocale)) {
            if (availableLocales.length > 0) {
              set({ locale: availableLocales[0] });
            }
          }
        },
      };
    },
    {
      name: "locale-storage", // Tên key trong localStorage
      partialize: (state) => ({
        locale: state.locale,
      }),
      // Khi rehydrate, kiểm tra locale có hợp lệ không
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Không gọi initializeLocale ở đây vì user có thể chưa sẵn sàng
            // Sẽ được gọi từ I18nProvider khi component mount
          }
        };
      },
    }
  )
);
