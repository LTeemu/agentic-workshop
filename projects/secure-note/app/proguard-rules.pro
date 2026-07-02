# Hilt
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.securenome.**$$serializer { *; }
-keepclassmembers class com.securenome.** { *** Companion; }
-keepclasseswithmembers class com.securenome.** { kotlinx.serialization.KSerializer serializer(...); }
