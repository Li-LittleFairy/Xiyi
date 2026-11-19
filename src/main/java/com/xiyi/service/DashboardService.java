package com.xiyi.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

@Service
public class DashboardService {

    private final JdbcTemplate jdbcTemplate;

    public DashboardService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public DashboardSummary summary() {
        ZoneId businessZone = ZoneId.of("Asia/Shanghai");
        LocalDate businessDate = LocalDate.now(businessZone);
        LocalDateTime fromUtc = businessDate.atStartOfDay(businessZone)
                .withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime toUtc = businessDate.plusDays(1).atStartOfDay(businessZone)
                .withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
        return jdbcTemplate.queryForObject("""
                SELECT
                    SUM(o.status = 'RECEIVED') AS received_count,
                    SUM(o.status = 'WASHING') AS washing_count,
                    SUM(o.status = 'READY') AS ready_count,
                    SUM(o.status = 'COMPLETED') AS completed_count,
                    SUM(o.status = 'CANCELLED') AS cancelled_count,
                    SUM(o.received_at >= ? AND o.received_at < ?) AS today_order_count,
                    (SELECT COALESCE(SUM(p.amount_cents), 0)
                     FROM payment_record p
                     WHERE p.paid_at >= ? AND p.paid_at < ?) AS today_revenue_cents
                FROM laundry_order o
                """, (rs, rowNum) -> new DashboardSummary(
                rs.getLong("received_count"),
                rs.getLong("washing_count"),
                rs.getLong("ready_count"),
                rs.getLong("completed_count"),
                rs.getLong("cancelled_count"),
                rs.getLong("today_order_count"),
                rs.getLong("today_revenue_cents")
        ), Timestamp.valueOf(fromUtc), Timestamp.valueOf(toUtc),
                Timestamp.valueOf(fromUtc), Timestamp.valueOf(toUtc));
    }

    public record DashboardSummary(
            long receivedCount,
            long washingCount,
            long readyCount,
            long completedCount,
            long cancelledCount,
            long todayOrderCount,
            long todayRevenueCents
    ) {
    }
}
