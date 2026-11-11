package com.groovenspot.pulsecare.mobile.metrics

import com.groovenspot.pulsecare.metrics.Event
import com.groovenspot.pulsecare.metrics.EventName
import com.groovenspot.pulsecare.metrics.EventRules
import org.json.JSONObject
import java.io.File

/**
 * 보내기 전 이벤트를 모아 두는 파일 (한 줄에 하나). 하루 한 번 묶어서 보내고, 보낸 만큼 지웁니다.
 * 오래 못 보내도 [MAX]개를 넘으면 오래된 것부터 버립니다.
 */
class EventQueue(private val file: File) {

    @Synchronized
    fun add(e: Event) {
        val line = JSONObject()
            .put("name", e.name.key)
            .put("at", e.at)
            .put("props", JSONObject(EventRules.clean(e.name, e.props)))
            .toString()
        val lines = read() + line
        write(lines.takeLast(MAX))
    }

    @Synchronized
    fun peek(limit: Int = EventRules.MAX_BATCH): List<JSONObject> = read().take(limit).mapNotNull { runCatching { JSONObject(it) }.getOrNull() }

    /** 앞에서부터 [count]개를 보냈으니 지웁니다. 그사이 새로 들어온 것은 남습니다. */
    @Synchronized
    fun drop(count: Int) = write(read().drop(count))

    @Synchronized
    fun size(): Int = read().size

    @Synchronized
    fun clear() {
        file.delete()
    }

    private fun read(): List<String> = if (file.exists()) file.readLines().filter { it.isNotBlank() } else emptyList()

    private fun write(lines: List<String>) {
        file.parentFile?.mkdirs()
        file.writeText(lines.joinToString("\n"))
    }

    companion object {
        const val MAX = 2000

        fun event(name: EventName, props: Map<String, String>, at: Long = System.currentTimeMillis()) = Event(name, at, props)
    }
}
