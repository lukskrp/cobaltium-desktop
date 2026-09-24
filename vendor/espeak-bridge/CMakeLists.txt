# Builds the espeak_bridge shared library from a vendored espeak-ng 1.52.0
# source tree. The top-level espeak-ng CMake is intentionally skipped: it would
# run the host binary to compile espeak-ng-data, which we ship pre-compiled
# instead (see resources/espeak-ng-data).
#
#   cmake -S vendor/espeak-bridge -B build -DESPEAK_SRC=<espeak-ng source>
#   cmake --build build --config Release
#
# espeak-ng is GPLv3; the resulting bridge is distributed under GPLv3.
cmake_minimum_required(VERSION 3.15)
project(espeak_bridge LANGUAGES C)

if(NOT DEFINED ESPEAK_SRC)
  message(FATAL_ERROR "ESPEAK_SRC must point at an espeak-ng source tree")
endif()
get_filename_component(ESPEAK_SRC "${ESPEAK_SRC}" ABSOLUTE)

set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_C_STANDARD 11)

# Minimal build: no audio backends / async / Klatt / MBROLA.
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(USE_MBROLA OFF CACHE BOOL "" FORCE)
set(USE_LIBSONIC OFF CACHE BOOL "" FORCE)
set(USE_LIBPCAUDIO OFF CACHE BOOL "" FORCE)
set(USE_KLATT OFF CACHE BOOL "" FORCE)
set(USE_SPEECHPLAYER OFF CACHE BOOL "" FORCE)
set(USE_ASYNC OFF CACHE BOOL "" FORCE)

add_library(espeak-include INTERFACE)
target_include_directories(espeak-include INTERFACE
  "${ESPEAK_SRC}/src/include"
  "${ESPEAK_SRC}/src/include/compat")

add_subdirectory("${ESPEAK_SRC}/src/ucd-tools" "${CMAKE_BINARY_DIR}/ucd-tools")
add_subdirectory("${ESPEAK_SRC}/src/libespeak-ng" "${CMAKE_BINARY_DIR}/libespeak-ng")

add_library(espeak_bridge SHARED bridge.c)
target_include_directories(espeak_bridge PRIVATE
  "${ESPEAK_SRC}/src/include"
  "${ESPEAK_SRC}/src/include/compat")
target_link_libraries(espeak_bridge PRIVATE espeak-ng espeak-ng-config ucd)
