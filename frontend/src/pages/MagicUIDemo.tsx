import React from 'react';
import { 
  Sparkles, 
  ShimmerButton, 
  NumberTicker, 
  BorderBeam, 
  GradientText, 
  MagicCard, 
  FadeInStagger 
} from '../components/ui';

const MagicUIDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <Sparkles>
            <GradientText 
              className="text-4xl md:text-6xl font-bold mb-4"
              colors={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']}
            >
              Magic UI Components
            </GradientText>
          </Sparkles>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Beautiful animated components for your attendance dashboard
          </p>
        </div>

        {/* Magic Cards */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Magic Cards</h2>
          <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MagicCard gradientColor="#3b82f6">
              <h3 className="text-lg font-semibold mb-2">Interactive Cards</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Hover over these cards to see the beautiful gradient effect
              </p>
            </MagicCard>
            
            <MagicCard gradientColor="#10b981">
              <h3 className="text-lg font-semibold mb-2">Responsive Design</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Cards adapt to dark mode and different screen sizes
              </p>
            </MagicCard>
            
            <MagicCard gradientColor="#f59e0b">
              <h3 className="text-lg font-semibold mb-2">Customizable</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Change gradient colors and effects to match your brand
              </p>
            </MagicCard>
          </FadeInStagger>
        </section>

        {/* Number Tickers */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Number Tickers</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                <NumberTicker value={1234} />
              </div>
              <p className="text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
            
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                <NumberTicker value={98} />%
              </div>
              <p className="text-gray-600 dark:text-gray-400">Success Rate</p>
            </div>
            
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                <NumberTicker value={567} delay={0.2} />
              </div>
              <p className="text-gray-600 dark:text-gray-400">Active Sessions</p>
            </div>
            
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                <NumberTicker value={89} delay={0.4} />
              </div>
              <p className="text-gray-600 dark:text-gray-400">Performance Score</p>
            </div>
          </div>
        </section>

        {/* Shimmer Buttons */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Shimmer Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <ShimmerButton background="linear-gradient(45deg, #3b82f6, #1d4ed8)">
              Primary Action
            </ShimmerButton>
            
            <ShimmerButton background="linear-gradient(45deg, #10b981, #059669)">
              Success Action
            </ShimmerButton>
            
            <ShimmerButton background="linear-gradient(45deg, #f59e0b, #d97706)">
              Warning Action
            </ShimmerButton>
            
            <ShimmerButton background="linear-gradient(45deg, #ef4444, #dc2626)">
              Danger Action
            </ShimmerButton>
            
            <ShimmerButton background="linear-gradient(45deg, #8b5cf6, #7c3aed)">
              Purple Action
            </ShimmerButton>
          </div>
        </section>

        {/* Border Beam */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Border Beam</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BorderBeam className="h-32" colorFrom="#3b82f6" colorTo="#8b5cf6">
              <div className="p-6 h-full flex items-center justify-center">
                <h3 className="text-lg font-semibold">Animated Border</h3>
              </div>
            </BorderBeam>
            
            <BorderBeam className="h-32" colorFrom="#10b981" colorTo="#f59e0b" duration={10}>
              <div className="p-6 h-full flex items-center justify-center">
                <h3 className="text-lg font-semibold">Custom Speed</h3>
              </div>
            </BorderBeam>
          </div>
        </section>

        {/* Gradient Text */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Gradient Text</h2>
          <div className="space-y-4">
            <GradientText className="text-3xl">
              Beautiful Gradient Text
            </GradientText>
            
            <GradientText 
              className="text-2xl" 
              colors={['#ef4444', '#f97316', '#eab308']}
              animationSpeed={2}
            >
              Custom Colors & Speed
            </GradientText>
            
            <GradientText 
              className="text-xl" 
              colors={['#10b981', '#06b6d4', '#3b82f6']}
              showAnimation={false}
            >
              Static Gradient (No Animation)
            </GradientText>
          </div>
        </section>

        {/* Sparkles */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Sparkles Effect</h2>
          <div className="text-center">
            <Sparkles sparkleCount={12}>
              <div className="inline-block p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold mb-2">✨ Magic Happens Here ✨</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This content has animated sparkles around it
                </p>
              </div>
            </Sparkles>
          </div>
        </section>

        {/* Fade In Stagger */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Fade In Stagger</h2>
          <FadeInStagger className="space-y-4" staggerDelay={0.2}>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="font-semibold">First Item</h3>
              <p className="text-gray-600 dark:text-gray-400">This appears first</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="font-semibold">Second Item</h3>
              <p className="text-gray-600 dark:text-gray-400">This appears second</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="font-semibold">Third Item</h3>
              <p className="text-gray-600 dark:text-gray-400">This appears third</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="font-semibold">Fourth Item</h3>
              <p className="text-gray-600 dark:text-gray-400">This appears last</p>
            </div>
          </FadeInStagger>
        </section>

      </div>
    </div>
  );
};

export default MagicUIDemo;
