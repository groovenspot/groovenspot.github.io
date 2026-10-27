package com.groovenspot.pulsecare.mobile

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.groovenspot.pulsecare.mobile.family.FamilyRepository
import kotlin.concurrent.thread

/** Firebase는 google-services.json 대신 빌드 설정값으로 초기화합니다 (값이 없으면 푸시 없이 동작). */
class PulseApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (!pushConfigured) return
        val options = FirebaseOptions.Builder()
            .setApplicationId(BuildConfig.FIREBASE_APP_ID)
            .setApiKey(BuildConfig.FIREBASE_API_KEY)
            .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
            .setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
            .build()
        if (FirebaseApp.getApps(this).isEmpty()) FirebaseApp.initializeApp(this, options)
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            thread { FamilyRepository.registerPushToken(this, token) }
        }
    }

    companion object {
        val pushConfigured: Boolean get() = BuildConfig.FIREBASE_APP_ID.isNotEmpty()
    }
}
