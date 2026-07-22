package ir.omid.samplingapp.data.remote

import com.google.gson.annotations.SerializedName

data class NeshanReverseResponse(
    val status: String? = null,
    @SerializedName("formatted_address") val formattedAddress: String? = null,
    val city: String? = null,
    val state: String? = null,
    val neighbourhood: String? = null
)
