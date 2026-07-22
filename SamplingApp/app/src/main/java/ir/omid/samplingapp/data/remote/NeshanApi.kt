package ir.omid.samplingapp.data.remote

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query

interface NeshanApi {

    /** Turns a lat/lng into a human-readable address. Docs: https://platform.neshan.org/api/reverse-geocoding/ */
    @GET("v5/reverse")
    suspend fun reverseGeocode(
        @Header("Api-Key") apiKey: String,
        @Query("lat") lat: Double,
        @Query("lng") lng: Double
    ): NeshanReverseResponse

    companion object {
        val instance: NeshanApi by lazy {
            val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            val client = OkHttpClient.Builder().addInterceptor(logging).build()
            Retrofit.Builder()
                .baseUrl("https://api.neshan.org/")
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(NeshanApi::class.java)
        }
    }
}
