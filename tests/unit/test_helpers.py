"""
ユニットテスト: DB・Flask コンテキスト不要な純粋関数を対象とする
  - parse_date / parse_decimal  (app/api_route.py)
  - allocate_integer_values     (app/utils.py)
  - build_integer_settlement_result (app/utils.py)
"""
from datetime import date
from decimal import Decimal

from app.api_route import parse_date, parse_decimal
from app.utils import allocate_integer_values, build_integer_settlement_result


# ── parse_date ────────────────────────────────────────────────────────────────

class TestParseDate:
    def test_valid_date(self):
        result, err = parse_date('2024-06-15')
        assert result == date(2024, 6, 15)
        assert err is None

    def test_slash_format_is_invalid(self):
        result, err = parse_date('2024/06/15')
        assert result is None
        assert err == '日付が不正です'

    def test_month_out_of_range(self):
        result, err = parse_date('2024-13-01')
        assert result is None
        assert err == '日付が不正です'

    def test_day_out_of_range(self):
        result, err = parse_date('2024-01-32')
        assert result is None
        assert err == '日付が不正です'

    def test_empty_string(self):
        result, err = parse_date('')
        assert result is None
        assert err == '日付が不正です'

    def test_random_string(self):
        result, err = parse_date('not-a-date')
        assert result is None
        assert err == '日付が不正です'


# ── parse_decimal ──────────────────────────────��──────────────────────────────

class TestParseDecimal:
    def test_integer_string(self):
        result, err = parse_decimal('1000')
        assert result == Decimal('1000')
        assert err is None

    def test_decimal_string(self):
        result, err = parse_decimal('1234.56')
        assert result == Decimal('1234.56')
        assert err is None

    def test_alphabetic_string(self):
        result, err = parse_decimal('abc')
        assert result is None
        assert err == '金額が不正です'

    def test_empty_string(self):
        result, err = parse_decimal('')
        assert result is None
        assert err == '金額が不正です'

    def test_mixed_string(self):
        result, err = parse_decimal('12abc')
        assert result is None
        assert err == '金額が不正です'


# ── allocate_integer_values ───────────────────────────────────────────────────

class TestAllocateIntegerValues:
    def test_empty_list(self):
        assert allocate_integer_values([]) == []

    def test_single_value(self):
        assert allocate_integer_values([Decimal('500')]) == [500]

    def test_equal_amounts(self):
        result = allocate_integer_values([Decimal('300'), Decimal('300'), Decimal('300')])
        assert result == [300, 300, 300]
        assert sum(result) == 900

    def test_remainder_goes_to_preferred_index(self):
        # 1000 を 3 人: 333.33… → preferred(index=0) が端数を受け取る
        values = [Decimal('333.33'), Decimal('333.33'), Decimal('333.34')]
        result = allocate_integer_values(values, preferred_index=0)
        assert sum(result) == 1000
        assert result[0] >= result[1]

    def test_remainder_goes_to_last_if_preferred_out_of_range(self):
        values = [Decimal('50.5'), Decimal('50.5')]
        result = allocate_integer_values(values, preferred_index=99)
        assert sum(result) == 101

    def test_sum_is_always_correct(self):
        values = [Decimal('333.33'), Decimal('333.33'), Decimal('333.33')]
        result = allocate_integer_values(values, preferred_index=1)
        # 333.33 × 3 = 999.99 → ROUND_HALF_UP → 1000
        assert sum(result) == 1000


# ── build_integer_settlement_result ──────────────────────────────────────────

class TestBuildIntegerSettlementResult:
    def _make_summary(self, items):
        return [
            {
                'event_participant_id': i,
                'display_name': name,
                'total_paid': Decimal(str(paid)),
                'total_allocations': Decimal(str(alloc)),
            }
            for i, (name, paid, alloc) in enumerate(items, start=1)
        ]

    def test_two_person_simple(self):
        summary = self._make_summary([
            ('Alice', 1000, 500),
            ('Bob',      0, 500),
        ])
        _, settlements = build_integer_settlement_result(summary)
        assert len(settlements) == 1
        assert settlements[0]['payer_display_name'] == 'Bob'
        assert settlements[0]['payee_display_name'] == 'Alice'
        assert settlements[0]['amount'] == 500

    def test_three_person(self):
        # P1: 1500 払い / P2: 300 払い / P3: 0 払い、均等割 600
        # net: P1=+900, P2=-300, P3=-600
        summary = self._make_summary([
            ('P1', 1500, 600),
            ('P2',  300, 600),
            ('P3',    0, 600),
        ])
        _, settlements = build_integer_settlement_result(summary)
        total_paid = sum(s['amount'] for s in settlements)
        assert total_paid == 900  # P1 の正味受取額

    def test_balanced_no_settlement(self):
        summary = self._make_summary([
            ('Alice', 500, 500),
            ('Bob',   500, 500),
        ])
        _, settlements = build_integer_settlement_result(summary)
        assert settlements == []

    def test_preferred_ep_id_receives_remainder(self):
        # 1000 円を 3 人で割り切れない場合、preferred が端数を持つ
        summary = self._make_summary([
            ('P1', 1000, 333),
            ('P2',    0, 333),
            ('P3',    0, 334),
        ])
        integer_summary, _ = build_integer_settlement_result(summary, preferred_ep_id=1)
        totals = [item['total_paid'] + item['total_allocations'] for item in integer_summary]
        assert all(isinstance(t, int) for t in totals)
