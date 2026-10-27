package com.groovenspot.pulsecare.wear

import androidx.concurrent.futures.SuspendToFutureAdapter
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.ListenableFuture
import com.groovenspot.pulsecare.watch.WatchContract
import com.groovenspot.pulsecare.watch.WatchDisplay
import java.time.LocalDate

/** 점수 타일 (기획서 15번): 점수, 구간, 오늘의 미션. 누르면 앱을 엽니다. */
class ScoreTileService : TileService() {

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> =
        SuspendToFutureAdapter.launchFuture {
            val d = WatchContract.display(WatchStore.load(this@ScoreTileService), LocalDate.now())
            TileBuilders.Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                // 날짜가 바뀌면 "어제 기록"으로 바뀌도록 1시간마다 다시 그립니다.
                .setFreshnessIntervalMillis(60 * 60 * 1000L)
                .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout(d, packageName)))
                .build()
        }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        SuspendToFutureAdapter.launchFuture {
            ResourceBuilders.Resources.Builder().setVersion(RESOURCES_VERSION).build()
        }

    companion object {
        private const val RESOURCES_VERSION = "1"

        fun layout(d: WatchDisplay, packageName: String): LayoutElementBuilders.LayoutElement {
            val open = ModifiersBuilders.Clickable.Builder()
                .setId("open")
                .setOnClick(
                    ActionBuilders.LaunchAction.Builder()
                        .setAndroidActivity(
                            ActionBuilders.AndroidActivity.Builder()
                                .setPackageName(packageName)
                                .setClassName(MainActivity::class.java.name)
                                .build(),
                        )
                        .build(),
                )
                .build()
            return LayoutElementBuilders.Box.Builder()
                .setWidth(expand())
                .setHeight(expand())
                .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(open).build())
                .addContent(
                    LayoutElementBuilders.Column.Builder()
                        .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                        .addContent(text("오늘의 컨디션", 13f, WatchColors.MUTED))
                        .addContent(text(d.score, 48f, WatchColors.WHITE, bold = true))
                        .addContent(text(d.label, 14f, WatchColors.MINT))
                        .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(8f)).build())
                        .addContent(
                            text(
                                if (d.mission.isEmpty()) d.reason else (if (d.missionDone) "완료 · " else "") + d.mission,
                                13f,
                                WatchColors.WHITE,
                                maxLines = 2,
                            ),
                        )
                        .build(),
                )
                .build()
        }

        private fun text(value: String, size: Float, color: Int, bold: Boolean = false, maxLines: Int = 1) =
            LayoutElementBuilders.Text.Builder()
                .setText(value)
                .setMaxLines(maxLines)
                .setMultilineAlignment(LayoutElementBuilders.TEXT_ALIGN_CENTER)
                .setModifiers(
                    ModifiersBuilders.Modifiers.Builder()
                        .setPadding(ModifiersBuilders.Padding.Builder().setStart(dp(24f)).setEnd(dp(24f)).build())
                        .build(),
                )
                .setFontStyle(
                    LayoutElementBuilders.FontStyle.Builder()
                        .setSize(sp(size))
                        .setColor(argb(color))
                        .setWeight(if (bold) LayoutElementBuilders.FONT_WEIGHT_BOLD else LayoutElementBuilders.FONT_WEIGHT_NORMAL)
                        .build(),
                )
                .build()
    }
}
