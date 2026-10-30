package com.groovenspot.pulsecare.server

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import javax.sql.DataSource

/** JDBC 얇은 래퍼. 쿼리가 몇 개뿐이라 ORM 없이 SQL을 그대로 씁니다. */
class Db(private val dataSource: DataSource) {

    fun migrate() {
        val sql = Db::class.java.getResource("/schema.sql")!!.readText()
        tx { sql.split(";").map { it.trim() }.filter { it.isNotEmpty() && !it.lines().all { l -> l.startsWith("--") } }.forEach { exec(it) } }
    }

    fun <T> tx(block: Connection.() -> T): T = dataSource.connection.use { c ->
        c.autoCommit = false
        try {
            c.block().also { c.commit() }
        } catch (e: Throwable) {
            c.rollback()
            throw e
        }
    }

    companion object {
        fun connect(url: String, user: String?, password: String?): Db {
            val config = HikariConfig().apply {
                jdbcUrl = url
                user?.let { username = it }
                password?.let { this.password = it }
                maximumPoolSize = 5
            }
            return Db(HikariDataSource(config))
        }
    }
}

fun Connection.exec(sql: String, vararg args: Any?): Int = prepareStatement(sql).use { it.bind(args).executeUpdate() }

fun <T> Connection.query(sql: String, vararg args: Any?, row: (ResultSet) -> T): List<T> =
    prepareStatement(sql).use { st ->
        st.bind(args).executeQuery().use { rs -> buildList { while (rs.next()) add(row(rs)) } }
    }

private fun PreparedStatement.bind(args: Array<out Any?>): PreparedStatement {
    args.forEachIndexed { i, a ->
        when (a) {
            null -> setObject(i + 1, null)
            is String -> setString(i + 1, a)
            is Int -> setInt(i + 1, a)
            is Long -> setLong(i + 1, a)
            is Boolean -> setBoolean(i + 1, a)
            is java.time.LocalDate -> setObject(i + 1, a)
            else -> error("Unsupported parameter ${a::class}")
        }
    }
    return this
}

fun ResultSet.intOrNull(column: String): Int? = getInt(column).takeUnless { wasNull() }
