export interface Store {
    id: number;
    name: string;
    open_time_weekday: string;
    close_time_weekday: string;
    open_time_saturday?: string;
    close_time_saturday?: string;
    open_time_sunday?: string;
    close_time_sunday?: string;
}

export interface Employee {
    id: number;
    name: string;
    store_id: number;
    weekly_hours: number;
    rules: string;
}

export interface Schedule {
    id: number;
    employee_id: number;
    store_id: number;
    date: string;
    start_time: string;
    end_time: string;
    type: 'work' | 'absence' | 'reinforcement';
}
