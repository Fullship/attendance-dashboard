import React, { useState } from 'react';
import LazyImage from '../components/LazyImage';
import LazyVideo from '../components/LazyVideo';
import LazyMediaGallery from '../components/LazyMediaGallery';
import FilePreview from '../components/FilePreview';
import Card from '../components/Card';
import Button from '../components/Button';

/**
 * LazyLoadingDemo page showcasing all lazy loading components
 * This demonstrates the performance optimizations for media loading
 */
export const LazyLoadingDemo: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Sample media items for gallery demonstration
  const sampleMediaItems = [
    {
      id: '1',
      type: 'image' as const,
      src: 'https://picsum.photos/400/400?random=1',
      alt: 'Sample Image 1',
      caption: 'Beautiful landscape',
      blurDataURL:
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==',
    },
    {
      id: '2',
      type: 'image' as const,
      src: 'https://picsum.photos/400/400?random=2',
      alt: 'Sample Image 2',
      caption: 'Urban architecture',
    },
    {
      id: '3',
      type: 'video' as const,
      src: ['https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'],
      poster: 'https://picsum.photos/400/400?random=3',
      caption: 'Sample Video',
    },
    {
      id: '4',
      type: 'image' as const,
      src: 'https://picsum.photos/400/400?random=4',
      alt: 'Sample Image 4',
      caption: 'Nature photography',
    },
    {
      id: '5',
      type: 'image' as const,
      src: 'https://picsum.photos/400/400?random=5',
      alt: 'Sample Image 5',
      caption: 'Abstract art',
    },
    {
      id: '6',
      type: 'image' as const,
      src: 'https://picsum.photos/400/400?random=6',
      alt: 'Sample Image 6',
      caption: 'Portrait photography',
    },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMediaClick = (item: any, index: number) => {
    console.log('Media clicked:', item, index);
    // Here you could open a lightbox or full-screen view
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Lazy Loading Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Demonstrating performance-optimized image and video loading
          </p>
        </div>

        {/* Single Image Demo */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              LazyImage Component
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Images are loaded only when they enter the viewport. Features blur placeholder, error
              handling, and native loading="lazy" support.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <LazyImage
                src="https://picsum.photos/300/200?random=10"
                alt="Demo image with blur placeholder"
                className="rounded-lg"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />

              <LazyImage
                src="https://picsum.photos/300/200?random=11"
                alt="Demo image with loading state"
                className="rounded-lg"
              />

              <LazyImage
                src="https://invalid-url-for-error-demo.jpg"
                alt="Demo image with error state"
                className="rounded-lg"
              />
            </div>
          </div>
        </Card>

        {/* Video Demo */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              LazyVideo Component
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Videos are loaded when they enter the viewport. Supports multiple formats and
              progressive loading.
            </p>

            <div className="max-w-md mx-auto">
              <LazyVideo
                src={['https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4']}
                poster="https://picsum.photos/640/360?random=20"
                className="rounded-lg shadow-lg"
                controls
                muted
              />
            </div>
          </div>
        </Card>

        {/* File Upload Preview Demo */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              File Preview Component
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload files to see lazy-loaded previews with support for images and documents.
            </p>

            <div className="mb-4">
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {selectedFiles.map((file, index) => (
                  <FilePreview
                    key={index}
                    file={file}
                    maxWidth={120}
                    maxHeight={120}
                    onRemove={() => removeFile(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Media Gallery Demo */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              LazyMediaGallery Component
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              A complete gallery solution with lazy loading, responsive grid, and mixed media
              support.
            </p>

            <LazyMediaGallery
              items={sampleMediaItems}
              columns={3}
              gap={16}
              showCaptions={true}
              onItemClick={handleMediaClick}
            />
          </div>
        </Card>

        {/* Performance Benefits */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Performance Benefits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Lazy Loading Features:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Native loading="lazy" for modern browsers</li>
                  <li>• IntersectionObserver fallback for older browsers</li>
                  <li>• Configurable viewport margins</li>
                  <li>• Priority loading for above-the-fold content</li>
                  <li>• Progressive image enhancement</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">User Experience:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Blur placeholder images</li>
                  <li>• Smooth loading transitions</li>
                  <li>• Error state handling</li>
                  <li>• Loading indicators</li>
                  <li>• Responsive design</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Usage Examples
            </h2>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-800 dark:text-gray-200">
                {`// Basic image with lazy loading
<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  className="rounded-lg"
/>

// Image with blur placeholder
<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  blurDataURL="data:image/jpeg;base64,..."
  priority={false}
/>

// Video with lazy loading
<LazyVideo
  src="/path/to/video.mp4"
  poster="/path/to/poster.jpg"
  controls
  muted
/>

// Media gallery
<LazyMediaGallery
  items={mediaItems}
  columns={3}
  onItemClick={handleClick}
/>`}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LazyLoadingDemo;
