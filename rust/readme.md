## Building for Development

# If you have NVIDIA GPU:
cargo build --release --features cuda

# If you have AMD/Intel GPU:
cargo build --release --features vulkan

# If you have no GPU or want to test CPU:
cargo build --release

# For use dev use 
cargo run --features vulkan
or
cargo run --features cuda
or  
cargo run