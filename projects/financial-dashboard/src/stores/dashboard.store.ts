import { create } from "zustand";

export type ChartType = "candlestick" | "line";

export interface IndicatorToggles {
  sma20: boolean;
  sma50: boolean;
  rsi: boolean;
  macd: boolean;
  bollinger: boolean;
}

interface DashboardState {
  activeSymbol: string | null;
  dateRange: { from: Date; to: Date };
  chartType: ChartType;
  indicatorToggles: IndicatorToggles;

  setActiveSymbol: (symbol: string | null) => void;
  setDateRange: (range: { from: Date; to: Date }) => void;
  setChartType: (type: ChartType) => void;
  toggleIndicator: (key: keyof IndicatorToggles) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeSymbol: null,
  dateRange: {
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
  },
  chartType: "candlestick",
  indicatorToggles: {
    sma20: true,
    sma50: false,
    rsi: false,
    macd: false,
    bollinger: false,
  },

  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
  setDateRange: (range) => set({ dateRange: range }),
  setChartType: (type) => set({ chartType: type }),
  toggleIndicator: (key) =>
    set((state) => ({
      indicatorToggles: {
        ...state.indicatorToggles,
        [key]: !state.indicatorToggles[key],
      },
    })),
}));
