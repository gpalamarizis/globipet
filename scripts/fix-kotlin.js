const fs = require('fs')
const path = require('path')

const gradleProps = path.join(__dirname, '..', 'android', 'gradle.properties')

if (fs.existsSync(gradleProps)) {
  let content = fs.readFileSync(gradleProps, 'utf8')
  if (!content.includes('kotlinVersion=2.1.0')) {
    content = content.replace(/kotlinVersion=.*/g, '')
    content += '\nkotlinVersion=2.1.0\n'
    fs.writeFileSync(gradleProps, content)
    console.log('✅ Fixed kotlinVersion to 2.1.0')
  }
}
