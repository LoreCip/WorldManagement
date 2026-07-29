export type TimePrecision = "day" | "month" | "year";

export interface TimelineEventMeta {
  id: string;
  title: string;
  time_value: number;
  precision: TimePrecision;
  category_id: string | null;
}

export interface TimelineEventListItem extends TimelineEventMeta {
  end_time_value: number | null;
  article_id: string | null;
  map_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
}

export interface TimelineEvent extends TimelineEventMeta {
  description: string;
  end_time_value: number | null;
  article_id: string | null;
  map_id: string | null;
}

export interface TimeInput {
  year: number;
  month: number | null;
  day: number | null;
}

export interface TimelineCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface TimelineSavedView {
  id: string;
  name: string;
  center_value: number;
  pixels_per_day: number;
}

export interface CampaignSettings {
  current_date_value: number | null;
}

export interface TimelineEra {
  id: string;
  label: string;
  start_value: number;
  end_value: number;
  color: string;
}