"""
Script to verify header colors in downloaded Excel templates
"""
import xlrd
import sys

def check_xls_header_color(file_path):
    """Check the header color in an .xls file"""
    try:
        # Open the workbook
        workbook = xlrd.open_workbook(file_path, formatting_info=True)
        sheet = workbook.sheet_by_index(0)

        # Get the first row (header)
        row = sheet.row(0)

        # Get the cell info for the first cell
        cell = row[0]
        xf_index = cell.xf_index
        xf = workbook.xf_list[xf_index]

        # Get the background color (pattern)
        bg_index = xf.background.pattern_colour_index
        colour_map = workbook.colour_map

        # Get the RGB values for the background color
        if bg_index in colour_map:
            rgb = colour_map[bg_index]
            return {
                'file': file_path,
                'bg_index': bg_index,
                'rgb': rgb,
                'color_type': get_color_name(rgb)
            }
        else:
            return {
                'file': file_path,
                'bg_index': bg_index,
                'rgb': None,
                'color_type': 'unknown'
            }
    except Exception as e:
        return {
            'file': file_path,
            'error': str(e)
        }

def get_color_name(rgb):
    """Convert RGB tuple to color name approximation"""
    if rgb is None:
        return 'unknown'

    r, g, b = rgb[0], rgb[1], rgb[2]

    # xlwt light_red is approximately #FFC0CB (255, 192, 203)
    if r > 240 and g > 180 and g < 210 and b > 190 and b < 215:
        return 'light_red (浅红色)'

    # xlwt light_blue is approximately #ADD8E6 (173, 216, 230)
    if r > 160 and r < 180 and g > 200 and g < 230 and b > 220:
        return 'light_blue (浅蓝色)'

    # xlwt light_orange is approximately #FFDAB9 (255, 218, 185)
    if r > 240 and g > 200 and g < 230 and b > 170 and b < 200:
        return 'light_orange (浅橙色)'

    return f'unknown (RGB: {rgb})'

def main():
    print("=" * 60)
    print("验证下载模板的表头颜色")
    print("=" * 60)

    templates = [
        ('删除-模板.xls', 'light_red (浅红色)'),
        ('导入-模板.xls', 'light_blue (浅蓝色)'),
        ('修改-模板.xls', 'light_orange (浅橙色)')
    ]

    results = []
    for filename, expected_color in templates:
        filepath = f'D:\\dev\\ucm2\\{filename}'
        print(f"\n检查: {filename}")
        print(f"期望颜色: {expected_color}")

        result = check_xls_header_color(filepath)
        results.append(result)

        if 'error' in result:
            print(f"❌ 错误: {result['error']}")
        else:
            actual_color = result['color_type']
            print(f"实际颜色: {actual_color}")
            if expected_color in actual_color:
                print(f"✅ 颜色正确")
            else:
                print(f"❌ 颜色不匹配")

    print("\n" + "=" * 60)
    print("总结")
    print("=" * 60)

    all_passed = True
    for result in results:
        if 'error' in result:
            print(f"❌ {result['file']}: 错误 - {result['error']}")
            all_passed = False
        else:
            filename = result['file']
            actual_color = result['color_type']
            expected_color = next(t[1] for t in templates if t[0] in filename)
            if expected_color in actual_color:
                print(f"✅ {filename}: 颜色正确 ({actual_color})")
            else:
                print(f"❌ {filename}: 颜色不匹配 (期望: {expected_color}, 实际: {actual_color})")
                all_passed = False

    print("=" * 60)
    if all_passed:
        print("✅ 所有模板的表头颜色验证通过！")
        return 0
    else:
        print("❌ 部分模板的表头颜色验证失败！")
        return 1

if __name__ == '__main__':
    sys.exit(main())