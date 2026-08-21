// mp-zhiming/src/pages/chart-input/index.tsx · 排盘输入（M17 · P1）
// MVP：极简版 — 4 个必填（年/月/日/时）+ 性别 + 公历；地点硬编码北京
// 阶段 3.6 chart-result 落地后端联动；提交后 castChart → reLaunch chart-result
import { View, Text, Button, Picker, Input } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useState } from "react"
import { castChart } from "../../lib/api"
import { t } from "../../lib/i18n"

const HOURS = [
  "23-01", "01-03", "03-05", "05-07", "07-09", "09-11",
  "11-13", "13-15", "15-17", "17-19", "19-21", "21-23",
]
const now = new Date()

export default function ChartInput() {
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [day, setDay] = useState(now.getDate())
  const [hour, setHour] = useState(0) // index into HOURS
  const [gender, setGender] = useState<0 | 1>(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setErr(null)
    try {
      const h = Number(HOURS[hour].split("-")[0])
      const birth = {
        calendar: "solar" as const,
        isLeapMonth: false,
        year,
        month,
        day,
        hour: h,
        minute: 0,
        gender,
        location: { city: "北京" }, // MVP 占位；阶段 3.6 后接真实坐标
        useTrueSolarTime: true,
        sect: 1 as const,
        dstAdjusted: false,
      }
      const chart = await castChart(birth)
      await Taro.setStorageSync("zm-mp-last-chart", chart)
      await Taro.reLaunch({ url: "/pages/chart-result/index" })
    } catch (e) {
      setErr(String(e?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-6">{t("chart.title")}</Text>

      <Field label={t("chart.input.calendar")}>
        <Picker
          mode="selector"
          range={["公历", "农历"]}
          value={0}
          onChange={(e) => {
            /* MVP 阶段只支持公历；农历留待 v0.2 */
            void e
          }}
        >
          <View className="px-3 py-2 bg-card border border-rule rounded">
            <Text className="text-ink">公历</Text>
          </View>
        </Picker>
      </Field>

      <Field label={t("chart.input.birthTime")}>
        <View className="flex gap-2">
          <NumberBox value={year} min={1900} max={2100} onChange={setYear} />
          <NumberBox value={month} min={1} max={12} onChange={setMonth} />
          <NumberBox value={day} min={1} max={31} onChange={setDay} />
        </View>
        <Picker
          mode="selector"
          range={HOURS}
          value={hour}
          onChange={(e) => setHour(Number(e.detail.value))}
        >
          <View className="mt-2 px-3 py-2 bg-card border border-rule rounded">
            <Text className="text-ink">时：{HOURS[hour]}</Text>
          </View>
        </Picker>
      </Field>

      <Field label={t("chart.input.gender")}>
        <View className="flex gap-2">
          <View
            className={`flex-1 py-2 text-center rounded border ${gender === 0 ? "bg-accent text-white border-accent" : "bg-card text-ink border-rule"}`}
            onClick={() => setGender(0)}
          >
            <Text>{t("chart.input.male")}</Text>
          </View>
          <View
            className={`flex-1 py-2 text-center rounded border ${gender === 1 ? "bg-accent text-white border-accent" : "bg-card text-ink border-rule"}`}
            onClick={() => setGender(1)}
          >
            <Text>{t("chart.input.female")}</Text>
          </View>
        </View>
      </Field>

      <Field label={t("chart.input.birthPlace")}>
        <Input
          className="px-3 py-2 bg-card border border-rule rounded"
          placeholder={t("chart.input.placePh")}
          value="北京"
        />
      </Field>

      {err && <Text className="block mb-4 text-sm text-accent">{err}</Text>}

      <Button
        className="w-full mt-6 py-4 bg-accent text-white rounded-lg text-base"
        loading={busy}
        disabled={busy}
        onClick={submit}
      >
        {busy ? t("chart.input.submitting") : t("chart.input.submit")}
      </Button>
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="block text-sm text-muted mb-2">{label}</Text>
      {children}
    </View>
  )
}

function NumberBox({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Input
      type="number"
      value={String(value)}
      onInput={(e) => {
        const n = Number((e.detail as { value: string }).value)
        if (!Number.isNaN(n) && n >= min && n <= max) onChange(n)
      }}
      className="w-20 px-3 py-2 bg-card border border-rule rounded text-center"
    />
  )
}