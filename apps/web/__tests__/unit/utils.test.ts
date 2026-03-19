import { describe, it, expect } from "vitest"
import { cn } from "@workspace/ui/lib/utils"

describe("Utils", () => {
  describe("cn", () => {
    it("合并多个类名", () => {
      expect(cn("foo", "bar")).toBe("foo bar")
    })

    it("处理空值和 falsy 值", () => {
      expect(cn("foo", null, undefined, false, "", "bar")).toBe("foo bar")
    })

    it("处理条件类名", () => {
      expect(cn("foo", true && "bar", false && "baz")).toBe("foo bar")
    })

    it("处理对象语法", () => {
      expect(cn("foo", { bar: true, baz: false })).toBe("foo bar")
    })

    it("返回空字符串当没有类名", () => {
      expect(cn(null, undefined, false)).toBe("")
    })
  })
})
